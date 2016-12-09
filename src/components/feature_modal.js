const React = require('react')

const { connect } = require('react-redux')
const { Card, CardMedia, CardText, CardHeader } = require('material-ui/Card')
const IconButton = require('material-ui/IconButton').default
const CloseIcon = require('material-ui/svg-icons/navigation/close').default
const {FormattedMessage} = require('react-intl')

const getFeaturesById = require('../selectors/features_by_id')
const getFieldMapping = require('../selectors/field_mapping')
const getColorIndex = require('../selectors/color_index')
const getVisibleFields = require('../selectors/visible_fields')
const getFieldAnalysis = require('../selectors/field_analysis')
const {createMessage: msg} = require('../util/intl_helpers')
const MarkerIcon = require('./marker_icon')
const Image = require('./image')
const FeatureTable = require('./feature_table')

const styles = {
  card: {
    width: '100%',
    height: '100%',
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  cardContainerStyle: {
    flex: 1,
    flexDirection: 'column',
    display: 'flex'
  },
  header: {
    lineHeight: '22px',
    boxSizing: 'content-box',
    borderBottom: '1px solid #cccccc'
  },
  markerIcon: {
    width: 40,
    height: 40,
    margin: 0,
    marginRight: 16
  },
  scrollable: {
    flex: 1,
    overflow: 'auto'
  },
  media: {
    position: 'relative',
    height: 0,
    padding: '67% 0 0 0'
  },
  img: {
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    position: 'absolute',
    objectFit: 'cover'
  }
}

const FeatureModal = ({color, media, data, title, subtitle, onCloseClick}) => (
  <Card
    style={styles.card}
    containerStyle={styles.cardContainerStyle}
    zDepth={2}>
    <CardHeader
      style={styles.header}
      avatar={<MarkerIcon color={color} style={styles.markerIcon} />}
      title={<FormattedMessage {...msg('field_value')(title)} />}
      subtitle={<FormattedMessage {...msg('field_value')(subtitle)} />}>
      <IconButton style={{float: 'right'}} onClick={onCloseClick}>
        <CloseIcon />
      </IconButton>
    </CardHeader>
    <div style={styles.scrollable}>
      <CardMedia style={styles.media}>
        <Image style={styles.img} src={media} progress />
      </CardMedia>
      <CardText>
        <FeatureTable data={data} />
      </CardText>
    </div>
  </Card>
)

module.exports = connect(
  (state, ownProps) => {
    const featuresById = getFeaturesById(state)
    const colorIndex = getColorIndex(state)
    const fieldMapping = getFieldMapping(state)
    const visibleFields = getVisibleFields(state)
    const fieldAnalysis = getFieldAnalysis(state)

    const feature = featuresById[ownProps.id]
    if (!feature) return {}
    const geojsonProps = feature.properties
    const data = visibleFields
      .filter(f => typeof geojsonProps[f] !== 'undefined')
      .map(f => ({key: f, value: geojsonProps[f], type: fieldAnalysis[f].type}))
    if (feature.geometry) {
      data.unshift({
        key: 'location',
        value: feature.geometry.coordinates
      })
    }
    return {
      data: data,
      media: geojsonProps[fieldMapping.media],
      title: geojsonProps[fieldMapping.title],
      subtitle: geojsonProps[fieldMapping.subtitle],
      color: colorIndex[geojsonProps[fieldMapping.color]]
    }
  }
)(FeatureModal)
