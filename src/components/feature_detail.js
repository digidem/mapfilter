const React = require('react')
const { connect } = require('react-redux')
const find = require('lodash/find')
// const { PropTypes } = React
const { Card, CardMedia, CardText, CardHeader, CardActions } = require('material-ui/Card')
const {Table, TableBody, TableRow, TableRowColumn} = require('material-ui/Table')
const Avatar = require('material-ui/Avatar').default
const FlatButton = require('material-ui/FlatButton').default
const IconButton = require('material-ui/IconButton').default
const CloseIcon = require('material-ui/svg-icons/navigation/close').default

const getFlattenedFeatures = require('../selectors/flattened_features')
const getColorIndex = require('../selectors/color_index')
const MarkerIcon = require('./marker_icon')

const styles = {
  card: {
    width: '100%',
    maxHeight: '100%',
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
    position: 'absolute',
    objectFit: 'cover'
  },
  firstColumn: {
    maxWidth: 100,
    fontWeight: 'bold'
  }
}

const FeatureDetail = ({color, media, properties, title, subtitle, onCloseClick}) => (
  <Card
    style={styles.card}
    containerStyle={styles.cardContainerStyle}
    zDepth={2}>
    <CardHeader
      style={styles.header}
      avatar={<MarkerIcon color={color} style={styles.markerIcon} />}
      title={title}
      subtitle={subtitle}>
      <IconButton style={{float: 'right'}} onClick={onCloseClick}>
        <CloseIcon />
      </IconButton>
    </CardHeader>
    <div style={styles.scrollable}>
      <CardMedia style={styles.media}>
        <img style={styles.img} src={'http://resizer.digital-democracy.org/500/' + media} />
      </CardMedia>
      <CardText>
        <Table selectable={false}>
          <TableBody displayRowCheckbox={false}>
          {Object.keys(properties).map(prop => {
            return (
              <TableRow key={prop}>
                <TableRowColumn style={styles.firstColumn}>{prop}</TableRowColumn>
                <TableRowColumn>{properties[prop]}</TableRowColumn>
              </TableRow>
            )
          })}
          </TableBody>
        </Table>
      </CardText>
    </div>
  </Card>
)

module.exports = connect(
  (state, ownProps) => {
    const features = getFlattenedFeatures(state)
    const colorIndex = getColorIndex(state)
    const feature = find(features, {id: ownProps.id})
    if (!feature) return
    const geojsonProps = feature.properties
    return {
      properties: geojsonProps,
      media: geojsonProps[state.popupFields.img],
      title: geojsonProps[state.popupFields.title],
      subtitle: geojsonProps[state.popupFields.subtitle],
      color: colorIndex[geojsonProps[state.coloredField]]
    }
  }
)(FeatureDetail)