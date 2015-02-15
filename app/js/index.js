'use strict';

// globally self-installing deps
require('./lib/jquery-2.0.3.js')
require('./lib/locale.js')
require('./lib/leaflet-0.7.1.js')
require('./lib/bing_layer.js')
require('./lib/leaflet_providers.js')

// required for templates
var lodash = require('./lib/lodash.modern-2.4.1.js')
window._ = lodash

// app
require('../../data/locale.js')
var config = require('../../config.json')
var mapFilter = require('./mapfilter/mapfilter.js')


// Theres some subtle timing going on here due to the templates:
// 1. load global dependencies
// 2. globally expose lodash
// 3. set app initialization to run on nextTick
// 4. templates are loaded, using global lodash (via index.html)
// 5. app initialization happens
// 5. app uses templates

process.nextTick(function(){

  var app = window.app = mapFilter({
    // target for github database
    url: 'https://github.com/digidem/wapichan-data/tree/master/monitoring_form_v1',

    // app container
    el: $("#app"),

    // An array of filters to explore the data.
    // `field` is the field/attribute to filter by
    // `type` should be `discrete` for string data and `continuous` for numbers or dates
    // `expanded` sets whether the filter view is expanded or collapsed by default
    filters: [{
      type: "continuous",
      field: "today",
      expanded: true
    }, {
      type: "discrete",
      field: "happening",
      expanded: true
    }, {
      type: "discrete",
      field: "people",
      expanded: true
    }],

    // Template to generate maptile urls. See http://leafletjs.com/reference.html#url-template
    tileUrl: 'http://{s}.tiles.mapbox.com/v3/gmaclennan.wapichana_background/{z}/{x}/{y}.jpg',
    // tileUrl: 'http://localhost:20008/tile/wapichana_background/{z}/{x}/{y}.png',

    // API key for Bing Maps use
    bingKey: config.bingToken,
  })

})