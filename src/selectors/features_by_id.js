const { createSelector } = require('reselect')

const getFlattenedFeatures = require('./flattened_features')

const getFeaturesById = createSelector(
  getFlattenedFeatures,
  (features) => features.reduce((p, v) => {
    p[v.id] = v
    return p
  }, {})
)

module.exports = getFeaturesById
