import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import find from 'lodash/find'

import CustomContainer from './custom_container'
import TopBar from './top_bar'
import * as actionCreators from '../action_creators'

import Modal from '../components/modal'
import FilterPane from '../components/filter'
import FeatureDetail from '../components/feature_detail'
import Settings from '../components/settings'
import MapView from '../components/map'
import ReportView from '../components/report'
import MediaView from '../components/media'
import TableView from '../components/table'

const styles = {
  outer: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Roboto, sans-serif',
    WebkitFontSmoothing: 'antialiased',
    fontSize: 15,
    lineHeight: '24px'
  },
  inner: {
    display: 'flex',
    flex: 1
  },
  view: {
    flex: 3,
    position: 'relative'
  },
  actionButton: {
    position: 'absolute',
    bottom: 36,
    right: 36,
    zIndex: 2
  }
}

class IndexRoute extends React.Component {
  componentWillMount () {
    this.redirectIfNecessary(this.props)
  }

  componentWillReceiveProps (nextProps) {
    this.redirectIfNecessary(nextProps)
  }

  redirectIfNecessary ({activeModal, activeView, views, redirectView}) {
    if (!find(views, {id: activeView})) return redirectView(views[0].id)
    if (activeModal && !getModalComponent(activeModal)) redirectView(activeView)
  }

  render () {
    const {activeView, activeModal, actionButton: ActionButton, views, switchView, settingsTab, toolbarButtons, toolbarTitle} = this.props
    const ModalComponent = getModalComponent(activeModal)
    const ViewComponent = getViewComponent(activeView, views)

    return (
      <div className='outer container' style={styles.outer}>
        <TopBar views={views} activeView={activeView} onChangeTab={switchView} buttons={toolbarButtons} title={toolbarTitle} />
        <div className='inner container' style={styles.inner}>
          <FilterPane />
          <div style={styles.view}>
            <CustomContainer component={ViewComponent} />
          </div>
          {ActionButton && <div style={styles.actionButton}><ActionButton /></div>}
        </div>
        <Modal component={ModalComponent} activeTabId={settingsTab} />
      </div>
    )
  }
}

IndexRoute.defaultProps = {
  views: [{
    id: 'map',
    component: MapView
  }, {
    id: 'media',
    component: MediaView
  }, {
    id: 'report',
    component: ReportView
  }, {
    id: 'table',
    component: TableView
  }]
}

function getModalComponent (modal) {
  switch (modal) {
    case 'feature':
      return FeatureDetail
    case 'settings':
      return Settings
    default:
      return
  }
}

function getViewComponent (activeView, views) {
  var view = find(views, {id: activeView})
  if (!view) return () => <div />
  return view.component
}

export default connect(
  (state) => state.ui || {},
  (dispatch) => bindActionCreators(actionCreators, dispatch)
)(IndexRoute)
