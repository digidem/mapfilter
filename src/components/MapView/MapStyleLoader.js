/* global fetch, AbortController */

import { Component } from 'react'
import PropTypes from 'prop-types'
import { normalizeStyleURL } from '../../util/mapbox'

// Load a map style object from a URL and pass it to children as object
// Will interpret
export default class MapStyleLoader extends Component {
  static propTypes = {
    /**
     * children must be a function, called with params (error, mapStyle)
     * error will be null if no error
     * mapStyle will be undefined during loading
     * mapStyle will be a style object once loaded
     */
    children: PropTypes.func.isRequired,
    /**
     * If the style is hosted on Mapbox you must pass a valid access token
     */
    mapboxToken: PropTypes.string,
    /**
     * Map style. This must be an an object conforming to the schema described
     * in the [style reference](https://mapbox.com/mapbox-gl-style-spec/), or a
     * URL to a JSON style. To load a style from the Mapbox API, you can use a
     * URL of the form `mapbox://styles/:owner/:style`, where `:owner` is your
     * Mapbox account name and `:style` is the style ID. Or you can use one of
     * the predefined Mapbox styles.
     */
    mapStyle: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
  }

  state = {
    error: null
  }

  static getDerivedStateFromProps (props, state) {
    // If the mapStyle prop is an object, we don't need to load anything, just
    // pass it directly to the state
    if (typeof props.mapStyle === 'object' && props.mapStyle !== state.mapStyle) {
      return { mapStyle: props.mapStyle }
    }
    return null
  }

  componentDidMount () {
    const {mapStyle} = this.props
    if (typeof mapStyle === 'string') this.loadStyle(mapStyle)
  }

  componentDidUpdate (prevProps) {
    const {mapStyle} = this.props
    if (typeof mapStyle === 'string' && mapStyle !== prevProps.mapStyle) {
      this.loadStyle(mapStyle)
    }
  }

  componentWillUnmount () {
    if (this.styleRequest) this.styleRequest.abort()
  }

  render () {
    const { error, mapStyle } = this.state
    return this.props.children(error, mapStyle)
  }

  loadStyle (styleUrl) {
    const url = normalizeStyleURL(styleUrl, this.props.mapboxToken)
    if (this.styleRequest) this.styleRequest.abort()
    const signal = this.styleRequest = (new AbortController()).signal
    fetch(url, { signal })
      .then(res => res.json())
      .then(data => {
        this.setState({ mapStyle: data, error: null })
      })
      .catch(error => {
        if (error.name === 'AbortError') return
        this.setState({ error })
      })
      .finally(() => {
        this.styleRequest = null
      })
  }
}
