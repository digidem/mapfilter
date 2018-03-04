import React from 'react'
import PropTypes from 'prop-types'
import * as MFPropTypes from '../../util/prop_types'
import ImageGrid from './ImageGrid'
import { FIELD_TYPE_IMAGE, UNDEFINED_KEY } from '../../constants'

class MediaView extends React.Component {
  shouldComponentUpdate (nextProps) {
    return nextProps.fieldAnalysis !== this.props.fieldAnalysis ||
      nextProps.filteredFeatures !== this.props.filteredFeatures
  }

  getImages () {
    const {fieldAnalysis, filteredFeatures} = this.props
    const imageFieldNames = Object.keys(fieldAnalysis.properties).filter(
      fieldname => fieldAnalysis.properties[fieldname].type === FIELD_TYPE_IMAGE
    )
    return filteredFeatures.reduce((p, feature) => {
      imageFieldNames.forEach(f => {
        if (feature.properties[f] && feature.properties[f] !== UNDEFINED_KEY) {
          p.push({
            url: feature.properties[f],
            featureId: feature.id
          })
        }
      })
      return p
    }, [])
  }

  render () {
    const {showFeatureDetail} = this.props
    const images = this.getImages()
    return <ImageGrid images={images} onImageClick={showFeatureDetail} />
  }
}

MediaView.propTypes = {
  showFeatureDetail: PropTypes.func.isRequired,
  fieldAnalysis: MFPropTypes.fieldAnalysis,
  filteredFeatures: PropTypes.arrayOf(MFPropTypes.mapViewFeature).isRequired
}

MediaView.MfViewId = 'media'

export default MediaView
