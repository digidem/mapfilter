const {PropTypes} = require('react')

// GeoJSON passed to the map view must be a FeatureCollection
// of point features with specific properties used for the popup
// and marker coloring.
// We need to ensure each feature has an id so we can handle
// callbacks for when a marker is clicked or hovered.
const mapViewFeature = PropTypes.shape({
  type: PropTypes.oneOf(['Feature']),
  geometry: PropTypes.oneOfType([
    PropTypes.oneOf([null]),
    PropTypes.shape({
      type: PropTypes.oneOf(['Point']).isRequired,
      coordinates: PropTypes.array.isRequired
    })
  ]).isRequired,
  properties: PropTypes.shape({
    __mf_id: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]).isRequired,
    __mf_color: PropTypes.string.isRequired
  }).isRequired
})

const fieldMapping = PropTypes.shape({
  media: PropTypes.string,
  mediaType: PropTypes.string,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string
})

/* See https://www.mapbox.com/mapbox-gl-style-spec/#types-filter */
/* We only support a specific subset of the mapbox array spec */
const mapboxFilter = PropTypes.arrayOf(
  PropTypes.oneOfType([
    PropTypes.oneOf(['all']),
    PropTypes.arrayOf(
      PropTypes.string
    )
  ])
)

const features = PropTypes.arrayOf(
  PropTypes.shape({
    type: PropTypes.oneOf(['Feature']).isRequired,
    geometry: PropTypes.oneOfType([
      PropTypes.oneOf([null]),
      PropTypes.shape({
        type: PropTypes.oneOf(['Point']).isRequired,
        coordinates: PropTypes.array.isRequired
      })
    ]).isRequired,
    properties: PropTypes.object
  })
).isRequired

/**
 * Our filter structure is similar to mapbox filters but we index
 * by key and then expression. We only allow filters to combined
 * with logical AND using the "all" expression.
 * @example
 * ```
 * var filter = {
 *   name: {
 *     'in': ['bob', 'susan']
 *   },
 *   age: {
 *     '<=': 50,
 *     '>=': 30
 *   }
 * }
 */
const filters = PropTypes.objectOf(
  PropTypes.objectOf(
    PropTypes.arrayOf(PropTypes.string)
  )
)

module.exports = {
  mapViewFeature,
  fieldMapping,
  mapboxFilter,
  features,
  filters
}
