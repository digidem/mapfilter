const { createSelector } = require('reselect')
const urlRegex = require('url-regex')({exact: true})
const url = require('url')
const path = require('path')
const isPlainObject = require('is-plain-object')

const {FIELD_TYPES, FILTER_TYPES} = require('../constants')

// Max number of unique text values for a field to still be a filterable discrete field
const MAX_DISCRETE_VALUES = {
  [FIELD_TYPES.STRING]: 15,
  [FIELD_TYPES.NUMBER]: 5
}

const imageExts = ['jpg', 'tif', 'jpeg', 'png', 'tiff', 'webp']
const videoExts = ['mov', 'mp4', 'avi']
const filterableTypes = [
  FIELD_TYPES.DATE,
  FIELD_TYPES.STRING,
  FIELD_TYPES.NUMBER,
  FIELD_TYPES.BOOLEAN,
  FIELD_TYPES.ARRAY,
  FIELD_TYPES.STRING_OR_ARRAY,
  FIELD_TYPES.NUMBER_OR_ARRAY
]

function wc (s) {
  return s.split(/ |_/).length
}

function isFilterable (type) {
  return filterableTypes.indexOf(type) > -1
}

/**
 * Reducer that computes running mean, variance, min and max
 * Adapted from http://www.johndcook.com/blog/standard_deviation/
 * @param {Object} p The previous value for the analysis
 * @param {Number} x New value to be included in analysis
 * @param {Number} i Index of the current element being processed
 * @return {Object} New analysis including `x`
 */
function statReduce (p = {mean: NaN, vari: NaN, min: +Infinity, max: -Infinity}, x, i) {
  p.mean = isNaN(p.mean) ? 0 : p.mean
  const mean = p.mean + (x - p.mean) / (i + 1)
  x = x instanceof Date ? +x : x
  return {
    mean: mean,
    min: x < p.min ? x : p.min,
    max: x > p.max ? x : p.max,
    vari: i < 1 ? 0 : (p.vari * i + (x - p.mean) * (x - mean)) / (i + 1)
  }
}

function isMediaField (fieldType) {
  return [FIELD_TYPES.VIDEO, FIELD_TYPES.IMAGE, FIELD_TYPES.MEDIA].indexOf(fieldType) > -1
}

function isStringOrArray (fieldType) {
  return [FIELD_TYPES.STRING, FIELD_TYPES.ARRAY, FIELD_TYPES.STRING_OR_ARRAY].indexOf(fieldType) > -1
}

function isNumberOrArray (fieldType) {
  return [FIELD_TYPES.NUMBER, FIELD_TYPES.ARRAY, FIELD_TYPES.NUMBER_OR_ARRAY].indexOf(fieldType) > -1
}

/**
 * Reducer that returns 'mixed' if values are not all the same,
 * or 'media' if field is a mixture of image and video files
 * @param {any} p Previous value
 * @param {any} v Current value
 * @return {any} `v` or `mixed`
 */
function typeReduce (p, v) {
  if (!p || v === p) return v
  if (isMediaField(p) && isMediaField(v)) {
    return FIELD_TYPES.MEDIA
  } else if (isStringOrArray(p) && isStringOrArray(v)) {
    return FIELD_TYPES.STRING_OR_ARRAY
  } else if (isNumberOrArray(p) && isNumberOrArray(v)) {
    return FIELD_TYPES.NUMBER_OR_ARRAY
  } else {
    return FIELD_TYPES.MIXED
  }
}

function valuesReduce (p = {}, v) {
  v = Array.isArray(v) ? v : [v]
  v.forEach(function (w) {
    p[w] = typeof p[w] === 'undefined' ? 1 : p[w] + 1
  })
  return p
}

function getFilterType (f) {
  const keyCount = f.values && Object.keys(f.values).length
  if (!isFilterable(f.type)) return
  // No point in having a filter for only one value
  if (keyCount === 1) return
  switch (f.type) {
    case FIELD_TYPES.DATE:
      return FILTER_TYPES.DATE
    case FIELD_TYPES.NUMBER:
      if (keyCount <= MAX_DISCRETE_VALUES[FIELD_TYPES.NUMBER]) {
        return FILTER_TYPES.DISCRETE
      } else {
        f.values = undefined
        return FILTER_TYPES.RANGE
      }
    case FIELD_TYPES.BOOLEAN:
      return FILTER_TYPES.DISCRETE
    case FIELD_TYPES.STRING:
    case FIELD_TYPES.ARRAY:
    case FIELD_TYPES.STRING_OR_ARRAY:
    case FIELD_TYPES.NUMBER_OR_ARRAY:
      if (keyCount <= MAX_DISCRETE_VALUES[FIELD_TYPES.STRING]) {
        return FILTER_TYPES.DISCRETE
      } else {
        f.values = undefined
        return FILTER_TYPES.TEXT
      }
  }
}

const potentialUUIDTypes = [FIELD_TYPES.STRING, FIELD_TYPES.NUMBER]

/**
 * Guess if a field can be used as a UUID: There are as many different values
 * as there are features, and wordcount === 1 - this is to avoid text fields
 * been classified as UUID fields.
 * @param {object} f A field object with analysis props
 * @param {array} features Array of features
 * @return {Boolean} [description]
 */
function isUnique (f, features) {
  if (potentialUUIDTypes.indexOf(f.type) < 0) return
  const keyCount = f.values && Object.keys(f.values).length
  return features.length === keyCount &&
    f.wordStats.max === 1
}

/**
 * Returns the type of a value, guessing types `date`, `link`, `image`, `video`
 * @param {any} v Type to be evaluated
 * @return {string} One of `string`, `number`, `bool`, `date`, `link`, `image`, `video`
 */
function getType (v) {
  if (isDate(v)) return FIELD_TYPES.DATE
  if (typeof v === 'string' && urlRegex.test(v)) {
    const pathname = url.parse(v).pathname
    const ext = path.extname(pathname).slice(1)
    if (imageExts.indexOf(ext) > -1) return FIELD_TYPES.IMAGE
    if (videoExts.indexOf(ext) > -1) return FIELD_TYPES.VIDEO
    return FIELD_TYPES.LINK
  }
  if (Array.isArray(v)) return FIELD_TYPES.ARRAY
  return typeof v
}

function isDate (v) {
  if (v instanceof Date) return true
  return new Date(v) !== 'Invalid Date' && !isNaN(new Date(v))
}

/**
 * Guess if a field is a UUID: if it has a length greater than
 * 30, no variance in length, and is only one word.
**/
function isUUIDField (f) {
  if (!f.isUnique) return
  if (f.type !== FIELD_TYPES.STRING) return
  return f.lengthStats.mean > 30 &&
    f.lengthStats.vari === 0 &&
    f.wordStats.max === 1
}

/**
 * Analyzes the fields of features in a featureCollection and guesses the
 *   field type and what type of filter to use: `discrete`, `number`,
 *   `date` (subtype of continuous), or `text` (and field that has more than
 *   `maxTextValues` discrete values). Number fields with <= `maxNumberCount`
 *   different values are considered discrete.
 * @param {object} featureCollection GeoJson FeatureCollection
 * @return {object} An object with a key for each unique field name in the
 *   FeatureCollection with properties `type` of filter to use, a count for
 *   each discrete option, or a min/max for continuous fields
 */
const getFieldAnalysis = createSelector(
  (state) => state.features,
  function analyzeFields (features) {
    const analysis = {}
    let idFieldValues = {}
    // Iterate over every feature in the FeatureCollection
    for (let i = 0; i < features.length; i++) {
      if (features[i].id) idFieldValues = valuesReduce(idFieldValues, features[i].id)
      // For each feature, iterate over its properties
      traverse(features[i].properties, i)
    }

    function traverse (obj, i, prefix = '') {
      let keys = Object.keys(obj)
      for (let j = 0; j < keys.length; j++) {
        let value = obj[keys[j]]
        let fieldname = prefix + keys[j]
        if (isPlainObject(value)) {
          traverse(value, i, fieldname + '.')
          continue
        }
        let field = analysis[fieldname] = analysis[fieldname] || {fieldname: fieldname}
        let thisType = getType(value)
        field.type = typeReduce(field.type, thisType)
        field.count = (field.count || 0) + 1
        if (!isFilterable(field.type)) continue
        if (thisType === FIELD_TYPES.STRING) {
          field.wordStats = statReduce(field.wordStats, wc(value), i)
          field.lengthStats = statReduce(field.lengthStats, value.length, i)
        }
        if (thisType === FIELD_TYPES.ARRAY) {
          field.maxArrayLength = Math.max(field.maxArrayLength || 1, value.length)
        }
        if (thisType === FIELD_TYPES.NUMBER || thisType === FIELD_TYPES.DATE) {
          field.valueStats = statReduce(field.valueStats, value, i)
        }
        field.values = valuesReduce(field.values, value)
      }
    }

    for (let fieldname in analysis) {
      let field = analysis[fieldname]
      field.isUnique = isUnique(field, features)
      if (isUUIDField(field)) field.type = FIELD_TYPES.UUID
      field.filterType = getFilterType(field)
    }
    const isIdFieldUnique = Object.keys(idFieldValues).length === features.length
    // TODO: this could cause an edge-case (extremely unlikely) bug if a feature
    // has an existing property called `__validGeoJsonIdField`.
    // Should restructure analysis object
    analysis.__validGeoJsonIdField = isIdFieldUnique
    return analysis
  }
)

module.exports = getFieldAnalysis
