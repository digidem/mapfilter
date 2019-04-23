import React from 'react'
import {compose} from 'redux'
import {connect} from 'react-redux'
import Typography from '@material-ui/core/Typography'
import { withStyles } from '@material-ui/core/styles'
import classNames from 'classnames'

import Image from '../Image'
import FormattedValue from '../Shared/FormattedValue'
import getFeaturesById from '../../selectors/features_by_id'
import getFieldMapping from '../../selectors/field_mapping'
import getFieldAnalysis from '../../selectors/field_analysis'

const styles = {
  wrapper: {
    width: 200,
    padding: 0,
    backgroundColor: 'black',
    cursor: 'pointer',
    position: 'relative',
    willChange: 'transform',
    pointerEvents: 'none'
  },
  wrapperImage: {
    height: 200
  },
  image: {
    width: 200,
    height: 200,
    objectFit: 'cover',
    display: 'block',
    background: '#000000'
  },
  titleBox: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: 'white',
    padding: '0.25em 0.5em',
    boxSizing: 'border-box'
  },
  title: {
    color: 'white'
  },
  subheading: {
    color: 'white'
  }
}

const PopupContent = ({media, title, subtitle, classes, titleType, subtitleType}) => (
  <div className={classNames(classes.wrapper, {[classes.wrapperImage]: media})}>
    {media && <Image src={media} className={classes.image} />}
    <div className={classes.titleBox}>
      {title && <Typography variant='title' className={classes.title}>
        <FormattedValue value={title} type={titleType} />
      </Typography>}
      {subtitle && <Typography variant='subheading' className={classes.subheading}>
        <FormattedValue value={subtitle} type={subtitleType} />
      </Typography>}
    </div>
  </div>
)

const mapStateToProps = (state, ownProps) => {
  const featuresById = getFeaturesById(state)
  const fieldMapping = getFieldMapping(state)
  const feature = featuresById[ownProps.id]
  if (!feature) return {}
  const geojsonProps = feature.properties
  const fieldAnalysisProps = getFieldAnalysis(state).properties
  return {
    media: geojsonProps[fieldMapping.media],
    title: geojsonProps[fieldMapping.title],
    subtitle: geojsonProps[fieldMapping.subtitle],
    titleType: fieldAnalysisProps[fieldMapping.title] && fieldAnalysisProps[fieldMapping.title].type,
    subtitleType: fieldAnalysisProps[fieldMapping.subtitle] && fieldAnalysisProps[fieldMapping.subtitle].type
  }
}

export default compose(
  connect(mapStateToProps),
  withStyles(styles)
)(PopupContent)
