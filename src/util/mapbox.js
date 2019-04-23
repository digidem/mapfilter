// Code from https://github.com/mapbox/mapbox-gl-js/blob/master/src/util/mapbox.js

const urlRe = /^(\w+):\/\/([^/?]*)(\/[^?]+)?\??(.+)?/
const MAPBOX_API_URL = 'https://api.mapbox.com'

export const normalizeStyleURL = function (url, accessToken) {
  if (!isMapboxURL(url)) return url
  const urlObject = parseUrl(url)
  urlObject.path = `/styles/v1${urlObject.path}`
  return makeAPIURL(urlObject, accessToken)
}

function isMapboxURL (url) {
  return url.indexOf('mapbox:') === 0
}

function makeAPIURL (urlObject, accessToken) {
  const apiUrlObject = parseUrl(MAPBOX_API_URL)
  urlObject.protocol = apiUrlObject.protocol
  urlObject.authority = apiUrlObject.authority

  if (apiUrlObject.path !== '/') {
    urlObject.path = `${apiUrlObject.path}${urlObject.path}`
  }

  if (!accessToken) {
    throw new Error(`An API access token is required to use Mapbox GL.`)
  }
  if (accessToken[0] === 's') {
    throw new Error(`Use a public access token (pk.*) with Mapbox GL, not a secret access token (sk.*). ${help}`)
  }

  urlObject.params.push(`access_token=${accessToken}`)
  return formatUrl(urlObject)
}

function parseUrl (url) {
  const parts = url.match(urlRe)
  if (!parts) {
    throw new Error('Unable to parse URL object')
  }
  return {
    protocol: parts[1],
    authority: parts[2],
    path: parts[3] || '/',
    params: parts[4] ? parts[4].split('&') : []
  }
}

function formatUrl (obj) {
  const params = obj.params.length ? `?${obj.params.join('&')}` : ''
  return `${obj.protocol}://${obj.authority}${obj.path}${params}`
}
