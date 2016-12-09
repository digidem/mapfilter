var ff = require('feature-filter-geojson')
const { createSelector } = require('reselect')

const getFilterableFeatures = require('./filterable_features')
const getMapboxFilter = require('./mapbox_filter')

const getRawFilteredFeatures = createSelector(
  getFilterableFeatures,
  getMapboxFilter,
  (features, filter) => features.filter(ff(filter))
)

module.exports = getRawFilteredFeatures
