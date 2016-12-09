const omit = require('lodash/omit')

/**
 * Filter state is an object with whose properties are field names
 * that have filters set, and values are objects whose properties
 * are expressions, values arrays of expression arguments, e.g.
 * state.filter = {
 *   happening: {
 *     in: ['mining', 'fishing']
 *   },
 *   today: {
 *     '>=': 1415692800000,
 *     '<=': 1418198400000
 *   }
 * }
 * The only operator logic for combining filters that we support currently
 * is "all". These simplified filters are converted to the syntax used by
 * Mapbox https://www.mapbox.com/mapbox-gl-style-spec/#types-filter in
 * the selector selectors/mapbox_filter.js
 */
const filters = (state = {}, {type, payload = {}}) => {
  const {key, exp, val} = payload
  switch (type) {
    case 'UPDATE_FILTER':
      let filter
      if (!val) {
        filter = omit(state[key], exp)
        if (!Object.keys(filter).length) {
          return omit(state, key)
        }
      } else {
        filter = Object.assign({}, state[key], {
          [exp]: val
        })
      }
      return Object.assign({}, state, {
        [key]: filter
      })
    default:
      return state
  }
}

module.exports = filters
