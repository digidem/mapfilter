// From https://github.com/hzdg/react-imageloader/blob/9a6751ddc67b24043a9d0f250c72e070573ac613/src/index.js

import React from 'react'
import PropTypes from 'prop-types'

const Status = {
  PENDING: 'pending',
  LOADING: 'loading',
  LOADED: 'loaded',
  FAILED: 'failed'
}

export default class ImageLoader extends React.Component {
  static propTypes = {
    wrapper: PropTypes.func,
    className: PropTypes.string,
    style: PropTypes.object,
    preloader: PropTypes.func,
    src: PropTypes.string,
    onLoad: PropTypes.func,
    onError: PropTypes.func,
    imgProps: PropTypes.object
  }

  static defaultProps = {
    wrapper: React.createElement.bind('span')
  }

  state = {
    status: this.props.src ? Status.LOADING : Status.PENDING
  }

  handleLoad = (event) => {
    this.destroyLoader()
    this.setState({status: Status.LOADED})

    if (this.props.onLoad) this.props.onLoad(event)
  }

  handleError = (error) => {
    this.destroyLoader()
    this.setState({status: Status.FAILED})

    if (this.props.onError) this.props.onError(error)
  }

  componentDidMount () {
    if (this.state.status === Status.LOADING) {
      this.createLoader()
    }
  }

  componentWillReceiveProps (nextProps) {
    if (this.props.src !== nextProps.src) {
      this.setState({
        status: nextProps.src ? Status.LOADING : Status.PENDING
      })
    }
  }

  componentDidUpdate () {
    if (this.state.status === Status.LOADING && !this.img) {
      this.createLoader()
    }
  }

  componentWillUnmount () {
    this.destroyLoader()
  }

  getClassName () {
    let className = `imageloader ${this.state.status}`
    if (this.props.className) className = `${className} ${this.props.className}`
    return className
  }

  createLoader () {
    this.destroyLoader() // We can only have one loader at a time.

    this.img = new window.Image()
    this.img.onload = this.handleLoad
    this.img.onerror = this.handleError
    this.img.src = this.props.src
  }

  destroyLoader () {
    if (this.img) {
      this.img.onload = null
      this.img.onerror = null
      this.img = null
    }
  }

  renderImg () {
    const {src, imgProps} = this.props
    let props = {src}

    for (let k in imgProps) {
      if (imgProps.hasOwnProperty(k)) {
        props[k] = imgProps[k]
      }
    }

    return <img {...props} />
  }

  render () {
    let wrapperProps = {
      className: this.getClassName()
    }

    if (this.props.style) {
      wrapperProps.style = this.props.style
    }

    let wrapperArgs = [wrapperProps]

    switch (this.state.status) {
      case Status.LOADED:
        wrapperArgs.push(this.renderImg())
        break

      case Status.FAILED:
        if (this.props.children) wrapperArgs.push(this.props.children)
        break

      default:
        if (this.props.preloader) wrapperArgs.push(this.props.preloader())
        break
    }

    return this.props.wrapper(...wrapperArgs)
  }
}
