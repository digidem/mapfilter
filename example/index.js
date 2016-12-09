const React = require('react')
const ReactDOM = require('react-dom')
const MapFilter = require('../')
const fs = require('fs')
const path = require('path')

const sampleGeoJSON = fs.readFileSync(path.join(__dirname, './sample.geojson'), 'utf8')
const features = JSON.parse(sampleGeoJSON).features

ReactDOM.render(<MapFilter features={features} />, document.getElementById('root'))
