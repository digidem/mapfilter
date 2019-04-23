import { connect } from 'react-redux'
import omit from 'lodash/omit'

import {
  moveMap,
  showFeatureDetail,
  requestPrint,
  updateViewState,
  openSettings
} from '../action_creators'

import { createElement } from '../util/general_helpers'
import getFieldAnalysis from '../selectors/field_analysis'
import getFilterableFeatures from '../selectors/filterable_features'
import getFeaturesById from '../selectors/features_by_id'
import getFilteredFeatures from '../selectors/filtered_features'
import getMapBoxFilter from '../selectors/mapbox_filter'
import getFieldMapping from '../selectors/field_mapping'
import getColorIndex from '../selectors/color_index'
import getVisibleFields from '../selectors/visible_fields'

const ViewContainer = (props) => createElement(props.component, omit(props, 'component'), props.children)

function mapStateToProps (state, ownProps) {
  var component = ownProps.component
  return {
    children: component.props && component.props.children,
    viewState: state.viewStates[component.MfViewId],
    willPrint: state.print.willPrint,
    paperSize: state.print.paperSize,
    mapStyle: state.mapStyle,
    settings: state.settings,
    features: getFilterableFeatures(state),
    featuresById: getFeaturesById(state),
    fieldAnalysis: getFieldAnalysis(state),
    fieldOrder: state.fieldOrder,
    filter: getMapBoxFilter(state),
    filteredFeatures: getFilteredFeatures(state),
    fieldMapping: getFieldMapping(state),
    colorIndex: getColorIndex(state),
    visibleFields: getVisibleFields(state)
  }
}

export default connect(
  mapStateToProps,
  (dispatch, ownProps) => ({
    moveMap: (payload) => dispatch(moveMap(payload)),
    showFeatureDetail: (payload) => dispatch(showFeatureDetail(payload)),
    requestPrint: (payload) => dispatch(requestPrint(payload)),
    openSettings: (payload) => dispatch(openSettings(payload)),
    updateViewState: (viewState) => dispatch(updateViewState({id: ownProps.component.MfViewId, state: viewState}))
  })
)(ViewContainer)
