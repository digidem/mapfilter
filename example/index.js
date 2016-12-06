const React = require('react')
const ReactDOM = require('react-dom')
const MapFilter = require('../')
const fs = require('fs')
const path = require('path')

// TODO: parsing dates should be in a selector
/**
 * Attempt to parse a datestring, returning `false` if it can't be parsed
 * @param {string} possibleDate [description]
 * @return {date|boolean} returns a Date object or `false` if not a date.
 */
function reviveDate (k, v) {
  if (typeof v !== 'string') return v
  var date = new Date(v)
  if (isNaN(date)) return v
  return date
}

const sampleGeoJSON = fs.readFileSync(path.join(__dirname, './sample.geojson'), 'utf8')
const features = JSON.parse(sampleGeoJSON, reviveDate).features

ReactDOM.render(<MapFilter features={features} />, document.getElementById('root'))
