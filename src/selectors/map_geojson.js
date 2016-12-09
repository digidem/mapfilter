const { createSelector } = require('reselect')

const getFilterableFeatures = require('./filterable_features')
const getRawFilteredFeatures = require('./filtered_features_raw')
const getColorIndex = require('./color_index')
const getColoredField = require('./colored_field')
const CONFIG = require('../../config.json')

const getMapGeoJSON = createSelector(
  getFilterableFeatures,
  getRawFilteredFeatures,
  getColoredField,
  getColorIndex,
  (features, filteredFeatures, coloredField, colorIndex) => {
    return {
      type: 'FeatureCollection',
      features: features.map(feature => {
        const props = feature.properties
        const colorHex = colorIndex[props[coloredField] || props[coloredField + '.0']]
        const newProps = Object.assign({}, props, {
          __mf_id: feature.id,
          __mf_color: (colorHex || CONFIG.defaultColor).slice(1),
          __mf_label: CONFIG.labelChars.charAt(filteredFeatures.indexOf(feature))
        })
        return Object.assign({}, feature, {
          properties: newProps
        })
      })
    }
  }
)

module.exports = getMapGeoJSON
