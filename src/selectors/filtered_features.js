const { createSelector } = require('reselect')
const assign = require('object-assign')

const getFeaturesById = require('./features_by_id')
const getRawFilteredFeatures = require('./filtered_features_raw')
const getColorIndex = require('./color_index')
const getColoredField = require('./colored_field')
const CONFIG = require('../../config.json')

const getFilteredFeatures = createSelector(
  getFeaturesById,
  getRawFilteredFeatures,
  getColoredField,
  getColorIndex,
  (featuresById, filteredFeatures, colorIndex, coloredField) => {
    return filteredFeatures.map((f, i) => {
      return assign({}, f, {
        __label: CONFIG.labelChars.charAt(i)
      })
    })
  }
)

module.exports = getFilteredFeatures
