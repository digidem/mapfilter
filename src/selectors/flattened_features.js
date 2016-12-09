const { createSelector } = require('reselect')
const flat = require('flat')
const assign = require('object-assign')

const getFeaturesWithIds = require('./features_with_ids')
const getColorIndex = require('./color_index')
const getColoredField = require('./colored_field')
const CONFIG = require('../../config.json')

const getFlattenedFeatures = createSelector(
  getFeaturesWithIds,
  getColoredField,
  getColorIndex,
  (features, colorIndex, coloredField) => {
    return features.map(f => {
      const newProps = flat(f.properties, {safe: true})
      const coloredFieldValue = newProps[coloredField]
      const colorHex = Array.isArray(coloredFieldValue)
        ? colorIndex[coloredFieldValue[0]] : colorIndex[coloredFieldValue]
      return assign({}, f, {
        properties: newProps,
        __color: (colorHex || CONFIG.defaultColor).slice(1)
      })
    })
  }
)

module.exports = getFlattenedFeatures
