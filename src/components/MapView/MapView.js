import debug from 'debug'
import PropTypes from 'prop-types'
import React from 'react'
import MapboxLayers from 'mapbox-gl-layers'
import mapboxgl from 'mapbox-gl'
import deepEqual from 'deep-equal'
import assign from 'object-assign'
import featureFilter from 'feature-filter-geojson'
import { withStyles } from 'material-ui/styles'

import * as MFPropTypes from '../../util/prop_types'
import { getBoundsOrWorld } from '../../util/map_helpers'

import config from '../../../config.json'
import Popup from './Popup'

require('mapbox-gl/dist/mapbox-gl.css')

/* Mapbox [API access token](https://www.mapbox.com/help/create-api-access-token/) */
mapboxgl.accessToken = config.mapboxToken

const log = debug('mf:mapview')

const styles = {
  root: {
    width: '100%',
    height: '100%',
    position: 'absolute'
  },
  map: {
    width: '100%',
    height: '100%'
  }
}

const emptyGeoJson = {
  type: 'FeatureCollection',
  features: []
}

const labelStyleLayer = {
  id: 'labels',
  type: 'symbol',
  source: 'features',
  layout: {
    'text-field': '',
    'text-allow-overlap': true,
    'text-ignore-placement': true,
    'text-size': 9,
    'text-font': [
      'DIN Offc Pro Bold',
      'Arial Unicode MS Bold'
    ]
  },
  paint: {
    'text-color': '#fff',
    'text-halo-color': 'rgba(100,100,100, 0.3)',
    'text-halo-width': 0.3
  }
}

const pointStyleLayer = {
  id: 'points',
  type: 'circle',
  source: 'features',
  paint: {
    // make circles larger as the user zooms from z12 to z22
    'circle-radius': {
      'base': 1.5,
      'stops': [[7, 5], [18, 25]]
    },
    'circle-color': {
      'property': '__mf_color',
      'type': 'identity'
    },
    'circle-opacity': 0.75,
    'circle-stroke-width': 1.5,
    'circle-stroke-color': '#ffffff',
    'circle-stroke-opacity': 0.9
  }
}

const pointHoverStyleLayer = {
  id: 'points-hover',
  type: 'circle',
  source: 'hover',
  paint: assign({}, pointStyleLayer.paint, {
    'circle-opacity': 1,
    'circle-stroke-width': 2.5,
    'circle-stroke-color': '#ffffff',
    'circle-stroke-opacity': 1
  })
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
    center: PropTypes.array,
    /* layers to see in the map view */
    layers: PropTypes.arrayOf(PropTypes.shape({
      /** The unique identifier for this tile set found in style.json */
      id: PropTypes.string,
      /** A localized display name for the tile set */
      name: PropTypes.string
    })),
    /* Called when layer choice changed by user */
    onChangeLayers: PropTypes.func,
    /* Geojson FeatureCollection of features to show on map */
    features: PropTypes.arrayOf(MFPropTypes.mapViewFeature).isRequired,
    /* Current filter (See https://www.mapbox.com/mapbox-gl-style-spec/#types-filter) */
    filter: MFPropTypes.mapboxFilter,
    /**
     * - NOT yet dynamic e.g. if you change it the map won't change
     * Map style. This must be an an object conforming to the schema described in the [style reference](https://mapbox.com/mapbox-gl-style-spec/), or a URL to a JSON style. To load a style from the Mapbox API, you can use a URL of the form `mapbox://styles/:owner/:style`, where `:owner` is your Mapbox account name and `:style` is the style ID. Or you can use one of the predefined Mapbox styles.
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
    zoom: PropTypes.number,
    interactive: PropTypes.bool
  }

  state = {}

  handleMapMoveOrZoom = (e) => {
    this.props.moveMap({
      center: this.map.getCenter().toArray(),
      zoom: this.map.getZoom(),
      bearing: this.map.getBearing()
    })
  }

  handleMapClick = (e) => {
    // if (!this.map.loaded()) return
    var features = this.map.queryRenderedFeatures(
      e.point,
      {layers: ['points-hover']}
    )
    if (!features.length) return
    this.setState({lngLat: null})
    this.props.showFeatureDetail(features[0].properties.__mf_id)
  }

  handleMouseMove = (e) => {
    if (!this.map.loaded()) return
    var features = this.map.queryRenderedFeatures(
      e.point,
      {layers: ['points', 'points-hover']}
    )
    this.map.getCanvas().style.cursor = (features.length) ? 'pointer' : ''
    if (!features.length) {
      this.setState({lngLat: null})
      this.map.getSource('hover').setData(emptyGeoJson)
      return
    }
    this.map.getSource('hover').setData(features[0])
    this.setState({lngLat: features[0].geometry.coordinates})
    this.setState({id: features[0].properties.__mf_id})
  }

  ready (fn) {
    if (this.map.loaded() && !this._styleDirty) {
      fn()
    } else {
      this.map.once('load', () => fn.call(this))
    }
  }

  render () {
    const {classes} = this.props
    return (
      <div className={classes.root}>
        <div
          ref={(el) => (this.mapContainer = el)}
          className={classes.map}
        />
        {this.state.lngLat && <Popup map={this.map} {...this.state} />}
      </div>
    )
  }

  centerMap (geojson) {
    this.map.fitBounds(getBoundsOrWorld(geojson), {padding: 15, duration: 0})
  }

  // The first time our component mounts, render a new map into `mapDiv`
  // with settings from props.
  componentDidMount () {
    const { center, interactive, mapStyle, zoom, layers, onChangeLayers } = this.props

    const mapDiv = document.createElement('div')
    mapDiv.style.height = '100%'
    mapDiv.style.width = '100%'
    this.mapContainer.appendChild(mapDiv)

    const map = window.map = this.map = new mapboxgl.Map({
      style: mapStyle,
      container: mapDiv,
      center: center || [0, 0],
      zoom: zoom || 0
    })

    map.on('load', function () {
      if (layers) {
        layers.onChange = onChangeLayers
        map.addControl(new MapboxLayers(layers), 'top-right')
      }
    })
    map._prevStyle = mapStyle

    if (!interactive) {
      map.scrollZoom.disable()
    }

    // Add zoom and rotation controls to the map.
    map.addControl(new mapboxgl.NavigationControl())
    map.dragRotate.disable()
    map.touchZoomRotate.disableRotation()

    this.geojson = this.getGeoJson(this.props)

    map.once('load', () => {
      if (interactive) {
        map.on('moveend', this.handleMapMoveOrZoom)
        map.on('click', this.handleMapClick)
        map.on('mousemove', this.handleMouseMove)
      }
      this.setupLayers(this.props)
    })

    // If no map center or zoom passed, set map extent to extent of marker layer
    if (!center || !zoom) {
      this.centerMap(this.geojson)
    }
  }

  componentWillReceiveProps (nextProps) {
    this.updateIfNeeded(nextProps, this.props)
  }

  componentWillUnmount () {
    this.map.off('moveend', this.handleMapMoveOrZoom)
    this.map.off('click', this.handleMapClick)
    this.map.off('mousemove', this.handleMouseMove)
    this.map.remove()
  }

  setupLayers (props) {
    const {filter, labelPoints} = props
    this.map.addSource('features', {type: 'geojson', data: this.geojson})
    // TODO: Should choose style based on whether features are point, line or polygon
    this.map.addSource('hover', {type: 'geojson', data: emptyGeoJson})
    this.map.addLayer(pointStyleLayer)
    this.map.addLayer(pointHoverStyleLayer)
    this.map.addLayer(labelStyleLayer)
    this.map.setFilter('points', filter)
    this.map.setFilter('labels', filter)
    if (labelPoints) {
      this.map.setLayoutProperty('labels', 'text-field', '{__mf_label}')
      this.map.setPaintProperty('points', 'circle-radius', 7)
    }
  }

  updateIfNeeded (nextProps, props = {}) {
    const {disableScrollToZoom} = props

    if (this.map._prevStyle !== nextProps.mapStyle) {
      log('updating style')
      this._styleDirty = true
      this.map.setStyle(nextProps.mapStyle)
      this.map._prevStyle = nextProps.mapStyle
      this.map.once('style.load', () => {
        this.setupLayers(nextProps)
        this._styleDirty = false
        if (!this.map._loaded) return
        this.map.fire('load')
      })
    }

    let shouldDataUpdate = nextProps.features !== props.features ||
      nextProps.fieldMapping !== props.fieldMapping ||
      nextProps.colorIndex !== props.colorIndex ||
      (nextProps.filter !== props.filter && props.labelPoints)

    if (shouldDataUpdate) {
      this.geojson = this.getGeoJson(nextProps)
      this.ready(() => {
        log('updating source', this.geojson)
        this.map.getSource('features').setData(this.geojson)
      })
      this.centerMap(this.geojson)
    }

    this.updateFilterIfNeeded(nextProps.filter)

    if (disableScrollToZoom !== nextProps.disableScrollToZoom) {
      nextProps.disableScrollToZoom ? this.map.scrollZoom.disable() : this.map.scrollZoom.enable()
    }

    const textField = nextProps.labelPoints ? '{__mf_label}' : ''
    this.ready(() => {
      if (this.map.getLayoutProperty('labels', 'text-field') !== textField) {
        log('updating labels "' + textField + '"')
        this.map.setLayoutProperty('labels', 'text-field', textField)
      }
    })
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
      log('Moving map')
      this.map.jumpTo(newMapPosition)
      return true
    }
    return false
  }

  updateFilterIfNeeded (filter) {
    if (filter !== this.props.filter && filter) {
      this.ready(() => {
        log('updating filter')
        this.map.setFilter('points', filter)
        this.map.setFilter('labels', filter)
      })
    }
  }

  // Construct GeoJSON for map
  getGeoJson ({features = [], fieldMapping = {}, colorIndex = {}, filter = []}) {
    let i = 0
    const ff = featureFilter(filter)
    return {
      type: 'FeatureCollection',
      features: features
        .filter(f => f.geometry)
        .map(f => {
          const newFeature = {
            type: 'feature',
            geometry: f.geometry,
            properties: assign({}, f.properties, {
              __mf_id: f.id,
              __mf_color: colorIndex[f.properties[fieldMapping.color] || f.properties[fieldMapping.color + '.0']]
            })
          }
          if (ff(f)) newFeature.properties.__mf_label = config.labelChars.charAt(i++)
          return newFeature
        })
    }
  }
}

MapView.MfViewId = 'map'

export default withStyles(styles)(MapView)
