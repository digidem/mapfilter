const debug = require('debug')('mf:mapview')
const React = require('react')
const ReactDOM = require('react-dom')
const { PropTypes } = React
const mapboxgl = require('mapbox-gl')
const deepEqual = require('deep-equal')

const MFPropTypes = require('../util/prop_types')
const { getBoundsOrWorld } = require('../util/map_helpers')

const config = require('../../config.json')
const Popup = require('./popup')

require('../../node_modules/mapbox-gl/dist/mapbox-gl.css')
require('../../css/popup.css')

/* Mapbox [API access token](https://www.mapbox.com/help/create-api-access-token/) */
mapboxgl.accessToken = config.mapboxToken

const mapStyle = require('../../example/map_style/style.json')
const loc = window.location
const baseUrl = loc.protocol + '//' + loc.host + '/map_style/'
;['glyphs', 'sprite'].forEach(function (key) {
  mapStyle[key] = mapStyle[key].replace(/mapfilter:\/\//, baseUrl)
})

const emptyFeatureCollection = {
  type: 'FeatureCollection',
  features: []
}

const style = {
  flex: 3,
  display: 'flex'
}

let savedMap
let savedMapDiv

const pointStyleLayer = {
  id: 'features',
  type: 'symbol',
  source: 'features',
  layout: {
    'icon-image': 'marker-{__mf_color}',
    'icon-allow-overlap': true,
    'icon-offset': [0, -10]
  }
}

const pointHoverStyleLayer = {
  id: 'features-hover',
  type: 'symbol',
  source: 'features',
  filter: ['==', '__mf_id', ''],
  layout: {
    'icon-image': 'marker-{__mf_color}-hover',
    'icon-allow-overlap': true,
    'icon-offset': [0, -10]
  }
}

const noop = (x) => x

class MapView extends React.Component {
  static defaultProps = {
    mapStyle: mapStyle,
    geojson: emptyFeatureCollection,
    onMarkerClick: noop,
    onMove: noop
  }

  static propTypes = {
    /* map center point [lon, lat] */
    center: PropTypes.array,
    /* Geojson FeatureCollection of features to show on map */
    geojson: PropTypes.shape({
      type: PropTypes.oneOf(['FeatureCollection']).isRequired,
      features: PropTypes.arrayOf(MFPropTypes.mapViewFeature).isRequired
    }),
    /* Current filter (See https://www.mapbox.com/mapbox-gl-style-spec/#types-filter) */
    filter: MFPropTypes.mapboxFilter,
    /**
     * - NOT yet dynamic e.g. if you change it the map won't change
     * Map style. This must be an an object conforming to the schema described in the [style reference](https://mapbox.com/mapbox-gl-style-spec/), or a URL to a JSON style. To load a style from the Mapbox API, you can use a URL of the form `mapbox://styles/:owner/:style`, where `:owner` is your Mapbox account name and `:style` is the style ID. Or you can use one of the predefined Mapbox styles.
     */
    mapStyle: PropTypes.string,
    /**
     * Triggered when a marker is clicked. Called with a (cloned) GeoJson feature
     * object of the marker that was clicked.
     */
    onMarkerClick: PropTypes.func,
    /* Triggered when map is moved, called with map center [lng, lat] */
    onMove: PropTypes.func,
    fieldMapping: MFPropTypes.fieldMapping,
    /* map zoom */
    zoom: PropTypes.number
  }

  handleMapMoveOrZoom = (e) => {
    this.props.onMove({
      center: this.map.getCenter().toArray(),
      zoom: this.map.getZoom(),
      bearing: this.map.getBearing()
    })
  }

  handleMapClick = (e) => {
    if (!this.map.loaded()) return
    var features = this.map.queryRenderedFeatures(
      e.point,
      {layers: ['features', 'features-hover']}
    )
    if (!features.length) return
    this.props.onMarkerClick(features[0].properties.__mf_id)
  }

  handleMouseMove = (e) => {
    if (!this.map.loaded()) return
    var features = this.map.queryRenderedFeatures(
      e.point,
      {layers: ['features', 'features-hover']}
    )
    this.map.getCanvas().style.cursor = (features.length) ? 'pointer' : ''
    if (!features.length) {
      this.popup.remove()
      this.map.setFilter('features-hover', ['==', '__mf_id', ''])
      return
    }
    const props = features[0].properties
    const hoveredFeatureId = props.__mf_id
    this.map.setFilter('features-hover', ['==', '__mf_id', hoveredFeatureId])
    // Popuplate the popup and set its coordinates
    // based on the feature found.
    if (!this.popup._map || hoveredFeatureId && hoveredFeatureId !== this.popup.__featureId) {
      this.popup.setLngLat(features[0].geometry.coordinates)
        .addTo(this.map)
        .__featureId = hoveredFeatureId
      this.renderPopup(props)
    }
  }

  renderPopup (featureProps) {
    const fieldMapping = this.props.fieldMapping
    const popupProps = Object.keys(fieldMapping).reduce((prev, field) => {
      prev[field] = featureProps[fieldMapping[field]]
      return prev
    }, {})
    const {media, title, subtitle} = popupProps
    this.popup._createContent()
    this.popup._update()
    ReactDOM.render(<Popup imgSrc={media} title={title} subtitle={subtitle} />, this.popup._content)
  }

  render () {
    return (
      <div
        ref={(el) => (this.mapContainer = el)}
        style={style}
      />
    )
  }

  // The first time our component mounts, render a new map into `mapDiv`
  // with settings from props.
  componentDidMount () {
    const { center, filter, mapStyle, geojson, zoom } = this.props
    let map

    if (savedMap) {
      this.mapContainer.appendChild(savedMapDiv)
      map = this.map = savedMap
      map.resize()
      this.componentWillReceiveProps(this.props)
      return
    }
    const mapDiv = savedMapDiv = document.createElement('div')
    mapDiv.style.flex = 1
    this.mapContainer.appendChild(mapDiv)

    map = this.map = savedMap = new mapboxgl.Map({
      style: mapStyle,
      container: mapDiv,
      center: center || [0, 0],
      zoom: zoom || 0
    })

    // Add zoom and rotation controls to the map.
    map.addControl(new mapboxgl.NavigationControl())

    this.popup = new mapboxgl.Popup({
      closeButton: false,
      anchor: 'bottom-left'
    })

    map.on('load', () => {
      map.on('moveend', this.handleMapMoveOrZoom)
      map.on('click', this.handleMapClick)
      map.on('mousemove', this.handleMouseMove)
      map.addSource('features', {type: 'geojson', data: geojson})
      // TODO: Should choose style based on whether features are point, line or polygon
      map.addLayer(pointStyleLayer)
      map.addLayer(pointHoverStyleLayer)
      if (filter) {
        map.setFilter('features', filter)
      }
    })

    // If no map center or zoom passed, set map extent to extent of marker layer
    if (!center || !zoom) {
      map.fitBounds(getBoundsOrWorld(geojson), {padding: 15})
    }
  }

  componentWillReceiveProps (nextProps) {
    this.moveIfNeeded(nextProps.center, nextProps.zoom)
    const isDataUpdated = this.updateDataIfNeeded(
      nextProps.geojson,
      nextProps.coloredField
    )
    if (isDataUpdated && !nextProps.center || !nextProps.zoom) {
      this.map.fitBounds(getBoundsOrWorld(nextProps.geojson), {padding: 15})
    }
    this.updateFilterIfNeeded(nextProps.filter)
  }

  // We always return false from this function because we don't want React to
  // handle any rendering of the map itself, we do all that via mapboxgl
  shouldComponentUpdate (nextProps) {
    return false
  }

  componentWillUnmount () {
    // this.map.remove()
  }

  /**
   * Moves the map to a new position if it is different from the current position
   * @param {array} center new coordinates for center of map
   * @param {number} zoom   new zoom level for map
   * @return {boolean} true if map has moved, otherwise false
   */
  moveIfNeeded (center, zoom) {
    const currentPosition = {
      center: this.map.getCenter().toArray(),
      zoom: this.map.getZoom()
    }
    const newMapPosition = {
      center,
      zoom
    }
    const shouldMapMove = center && zoom &&
      !deepEqual(currentPosition, newMapPosition)
    if (shouldMapMove) {
      debug('Moving map')
      this.map.jumpTo(newMapPosition)
      return true
    }
    return false
  }

  /**
   * [updateDataIfNeeded description]
   * @param {[type]} features     [description]
   * @param {[type]} coloredField [description]
   * @return {[type]} [description]
   */
  updateDataIfNeeded (geojson, coloredField) {
    if (geojson === this.geojson &&
        (!coloredField || coloredField === this.coloredField)) {
      return
    }
    this.geojson = geojson
    this.coloredField = coloredField
    debug('updated map geojson')
    if (this.map.loaded()) {
      this.map.getSource('features').setData(geojson)
    } else {
      this.map.on('load', () => this.map.getSource('features').setData(geojson))
    }
  }

  updateFilterIfNeeded (filter) {
    if (filter !== this.filter && filter) {
      this.filter = filter
      debug('new filter')
      if (this.map.style.loaded()) {
        this.map.setFilter('features', filter)
      } else {
        this.map.on('load', () => this.map.setFilter('features', filter))
      }
    }
  }
}

module.exports = MapView
