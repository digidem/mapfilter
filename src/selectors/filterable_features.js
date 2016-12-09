const flat = require('flat')
const { createSelector } = require('reselect')

const getFeaturesWithIds = require('./features_with_ids')
const getFieldAnalysis = require('./field_analysis')
const getIdFieldNames = require('./id_fields')
const {FIELD_TYPES} = require('../constants')

function dateStringToNumber (dateString) {
  return +(new Date(dateString))
}

const getFilterableFeatures = createSelector(
  getFeaturesWithIds,
  getFieldAnalysis,
  getIdFieldNames,
  (features, fieldAnalysis, idFieldNames) => features.map(f => {
    // We can't filter nested objects or arrays, so we flatten feature properties
    const properties = flat(f.properties)
    // To filter dates we need to convert date strings to numbers
    Object.keys(fieldAnalysis)
      .filter(f => fieldAnalysis[f].type === FIELD_TYPES.DATE)
      .forEach(f => {
        properties[f] = dateStringToNumber(properties[f])
      })
    return Object.assign({}, f, {properties})
  })
)

module.exports = getFilterableFeatures
