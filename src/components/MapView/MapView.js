
import React from 'react'
import debug from 'debug'
import PropTypes from 'prop-types'
import memoize from 'memoize-one'
import assign from 'object-assign'
import featureFilter from 'feature-filter-geojson'
import ReactMapGL, {Popup, NavigationControl} from 'react-map-gl'
import WebMercatorViewport from 'viewport-mercator-project'
import { withStyles } from '@material-ui/core/styles'
import { connect } from 'react-redux'

import * as MFPropTypes from '../../util/prop_types'
import { getBoundsOrWorld } from '../../util/map_helpers'

import PopupContent from './PopupContent'
import MapStyleLoader from './MapStyleLoader'

require('mapbox-gl/dist/mapbox-gl.css')

const log = debug('mf:mapview')

const LABEL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

const styles = {
  popup: {
    '& .mapboxgl-popup-content': {
      padding: 0
    },
    // The rules below override the style for anchoring the popup in the middle
    // of a side, instead forcing the anchor to a corner
    '&.mapboxgl-popup-anchor-left': {
      transform: 'translate(0, 0) !important'
    },
    '&.mapboxgl-popup-anchor-bottom': {
      transform: 'translate(-100%, -100%) !important'
    },
    '&.mapboxgl-popup-anchor-right': {
      transform: 'translate(-100%, 0) !important'
    },
    '&.mapboxgl-popup-anchor-top': {
      transform: 'translate(-100%, 0) !important'
    }
  }
}

const labelStyleLayer = {
  id: 'mapfilter_labels',
  type: 'symbol',
  source: 'features',
  layout: {
    'text-field': '{__mf_label}',
    'text-allow-overlap': true,
    'text-ignore-placement': true,
    'text-size': 9,
    'text-font': [
      'DIN Offc Pro Bold'
    ]
  },
  paint: {
    'text-color': '#fff',
    'text-halo-color': 'rgba(100,100,100, 0.3)',
    'text-halo-width': 0.3
  }
}

const pointStyleLayer = {
  id: 'mapfilter_points',
  type: 'circle',
  source: 'features',
  paint: {
    // make circles larger as the user zooms from z7 to z18
    'circle-radius': {
      'base': 1.5,
      'stops': [[7, 5], [18, 25]]
    },
    'circle-color': {
      'property': '__mf_color',
      'type': 'identity'
    },
    'circle-opacity': ['case',
      ['boolean', ['feature-state', 'hover'], false],
      1,
      0.75
    ],
    'circle-stroke-width': ['case',
      ['boolean', ['feature-state', 'hover'], false],
      2.5,
      1.5
    ],
    'circle-stroke-color': '#ffffff',
    'circle-stroke-opacity': ['case',
      ['boolean', ['feature-state', 'hover'], false],
      1,
      0.9
    ]
  }
}

const noop = (x) => x

class MapView extends React.Component {
  static defaultProps = {
    features: [],
    showFeatureDetail: noop,
    moveMap: noop,
    interactive: true,
    labelPoints: false
  }

  static propTypes = {
    /* map center point [lon, lat] */
    viewState: PropTypes.shape({
      longitude: PropTypes.number,
      latitude: PropTypes.number,
      zoom: PropTypes.number,
      transitionInterpolator: PropTypes.object,
      transitionDuration: PropTypes.number
    }),
    /* Geojson FeatureCollection of features to show on map */
    features: PropTypes.arrayOf(MFPropTypes.mapViewFeature).isRequired,
    /* Current filter (See https://www.mapbox.com/mapbox-gl-style-spec/#types-filter) */
    filter: MFPropTypes.mapboxFilter,
    mapboxToken: PropTypes.string,
    /**
     * Map style. This must be an an object conforming to the schema described
     * in the [style reference](https://mapbox.com/mapbox-gl-style-spec/), or a
     * URL to a JSON style. To load a style from the Mapbox API, you can use a
     * URL of the form `mapbox://styles/:owner/:style`, where `:owner` is your
     * Mapbox account name and `:style` is the style ID. Or you can use one of
     * the predefined Mapbox styles.
     */
    mapStyle: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    labelPoints: PropTypes.bool,
    /**
     * Triggered when a marker is clicked. Called with a (cloned) GeoJson feature
     * object of the marker that was clicked.
     */
    showFeatureDetail: PropTypes.func,
    /* Triggered when map is moved, called with map center [lng, lat] */
    moveMap: PropTypes.func.isRequired,
    fieldMapping: MFPropTypes.fieldMapping,
    /* map zoom */
    interactive: PropTypes.bool
  }

  state = {
    hoveredId: null
  }

  constructor (props) {
    super(props)
    log('Creating new map instance with props:', props)
    this.mapRef = window.mmap = React.createRef()
  }

  addLayers = memoize((style, showLabels) => {
    const layers = showLabels ? [pointStyleLayer, labelStyleLayer] : [pointStyleLayer]
    log('Adding layers to base style:', layers.map(l => l.id))
    return assign({}, style, {
      layers: style.layers.concat(layers)
    })
  })

  addSource = memoize((style, data) => {
    log('Adding GeoJSON source to base style')
    return assign({}, style, {
      sources: assign({}, style.sources, {
        features: {
          type: 'geojson',
          data: data
        }
      })
    })
  })

  getGeoJson = memoize((
    features = [],
    fieldMapping = {},
    colorIndex = {},
    filter = []
  ) => {
    log('Updating GeoJSON with current filter')
    const ff = featureFilter(filter)
    return {
      type: 'FeatureCollection',
      features: features
        .filter(f => f.geometry && ff(f))
        .map((f, i) => {
          const colorValue = f.properties[fieldMapping.color] ||
            f.properties[fieldMapping.color + '.0']
          const newFeature = {
            // Mapbox-gl still (2019-01-22) does not support string ids,
            // so we need to generate an id here and save the real is to props
            id: i,
            type: 'feature',
            geometry: f.geometry,
            properties: assign({}, f.properties, {
              __mf_id: f.id,
              __mf_color: colorIndex[colorValue],
              __mf_label: LABEL_CHARS.charAt(i)
            })
          }
          return newFeature
        })
    }
  })

  onViewStateChange = ({viewState, interactionState, oldViewState}) => {
    console.log('nextvp', viewState, interactionState, oldViewState)
    const { viewport, moveMap } = this.props
    const propsSpecifyMapLocation = viewport && typeof viewport.longitude === 'number'
    if (propsSpecifyMapLocation) return moveMap(viewState)
    // If the props for viewport are not set, zoom to bounds of data
    const fittedViewport = new WebMercatorViewport(viewState)
    const {longitude, latitude, zoom} = fittedViewport.fitBounds(
      getBoundsOrWorld(this.props.features),
      {padding: 15}
    )
    log('viewport not set on props, zooming to bounding box:', longitude, latitude, zoom)
    moveMap(assign({}, viewState, {
      longitude,
      latitude,
      zoom
    }))
  }

  onHover = event => {
    if (!this.props.interactive) return
    // The more declarative way of doing this would be to set a new style on
    // every render of the map if hoverId changes, but we use map feature state
    // for performance reasons here
    const map = this.mapRef.current.getMap()
    const hoveredId = event.features.length ? event.features[0].id : null
    if (hoveredId !== this.state.hoveredId) {
      if (hoveredId) log('Hover of feature id:', event.features[0].properties.__mf_id)
      map.setFeatureState({source: 'features', id: hoveredId}, { hover: true })
      map.setFeatureState({source: 'features', id: this.state.hoveredId}, { hover: false })
      this.setState({hoveredId})
    }
  }

  onClick = event => {
    if (!this.props.interactive) return
    if (!event.features.length) return log('Click detected but no feature')
    log('Clicked feature id:', event.features[0].properties.__mf_id)
    this.props.showFeatureDetail(event.features[0].properties.__mf_id)
  }

  getCursor = ({isHovering, isDragging}) => {
    if (isDragging) return 'grabbing'
    if (isHovering && this.props.interactive) return 'pointer'
    return 'grab'
  }

  render () {
    const { features, fieldMapping, colorIndex, filter,
      labelPoints, mapStyle, mapboxToken, classes, viewport } = this.props
    const { hoveredId } = this.state
    return <MapStyleLoader mapStyle={mapStyle} mapboxToken={mapboxToken}>
      {(error, mapStyle) => {
        if (error) return <div>{error.text}</div>
        if (!mapStyle) return null // TODO: show loading indicator
        const geojson = this.getGeoJson(features, fieldMapping, colorIndex, filter)
        const styleWithLayers = this.addLayers(mapStyle, labelPoints)
        const styleWithData = this.addSource(styleWithLayers, geojson)
        const hoveredFeature = hoveredId !== null && geojson.features[hoveredId]
        console.log(viewport)
        return <ReactMapGL
          ref={this.mapRef}
          {...(viewport || {})}
          interactiveLayerIds={['mapfilter_points']}
          maxPitch={0}
          dragRotate={false}
          width='100%'
          height='100%'
          mapStyle={styleWithData}
          onViewStateChange={this.onViewStateChange}
          onHover={this.onHover}
          onClick={this.onClick}
          getCursor={this.getCursor}
          mapboxApiAccessToken={mapboxToken}
        >
          <div className='mapboxgl-ctrl-top-left'>
            <NavigationControl
              showCompass={false}
              onViewStateChange={this.onViewStateChange}
            />
          </div>
          {hoveredFeature && <Popup
            className={classes.popup}
            longitude={hoveredFeature.geometry.coordinates[0]}
            latitude={hoveredFeature.geometry.coordinates[1]}
            tipSize={0}
            closeButton={false}
            captureClick={false}
            captureDrag={false}
            anchor='bottom-left'>
            <PopupContent id={hoveredFeature.properties.__mf_id} />
          </Popup>}
        </ReactMapGL>
      }}
    </MapStyleLoader>
  }
}

MapView.MfViewId = 'map'

export default withStyles(styles)(MapView)
