import React from 'react'
import { connect } from 'react-redux'
import { withStyles } from '@material-ui/core/styles'
import { bindActionCreators } from 'redux'
import find from 'lodash/find'
import assign from 'object-assign'

import ViewContainer from './ViewContainer'
import AppBar from '../components/AppBar'
import * as actionCreators from '../action_creators'

import Dialog from '@material-ui/core/Dialog'
import ConnectFilterPane from './ConnectFilterPane'
import FeatureDetail from './ConnectFeatureDetail'
import Settings from '../components/Settings'
import MapView from '../components/MapView'
import ReportView from '../components/ReportView'
import MediaView from '../components/MediaView'
import {createElement} from '../util/general_helpers'
import PrintDialog from '../components/PrintDialog'

const styles = theme => ({
  outer: {
    position: 'fixed',
    top: 0,
    bottom: 0,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    '@media print': {
      display: 'block',
      position: 'static',
      bottom: 'auto'
    }
  },
  inner: {
    display: 'flex',
    flex: 1,
    '@media print': {
      display: 'block'
    }
  },
  modalRoot: {
    display: 'block',
    overflow: 'scroll'
  },
  modalPaper: {
    [theme.breakpoints.down('sm')]: {
      padding: 0
    },
    backgroundColor: 'initial',
    maxHeight: 'initial',
    minHeight: '100%',
    position: 'relative',
    margin: '0 auto',
    padding: 32,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'none'
  },
  modalPaperMd: {
    maxWidth: 800
  },
  view: {
    flex: 3,
    position: 'relative'
  },
  actionButton: {
    position: 'absolute',
    bottom: 36,
    right: 36,
    zIndex: 2,
    '@media only print': {
      display: 'none'
    }
  },
  '@global': {
    '@media only print': {
      'body, html': {
        overflow: 'visible'
      },
      '.d-print-none': {
        display: 'none'
      },
      /* Override display: flex which breaks page-break-after */
      // Fix for page-break-after not working in Chrome see http://stackoverflow.com/questions/4884380/css-page-break-not-working-in-all-browsers/5314590
      div: {
        float: 'none !important'
      },
      /* TODO include some form of MapFilter header */
      /* TODO rotate the filter display and show state vs. allow interaction */
      '.mapboxgl-control-container': {
        display: 'none'
      }
    }
  }
})

class App extends React.Component {
  componentWillMount () {
    this.redirectIfNecessary(this.props)
  }

  componentWillReceiveProps (nextProps) {
    this.redirectIfNecessary(nextProps)
  }

  redirectIfNecessary ({activeModal, activeView, views, redirectView}) {
    if (!find(views, {MfViewId: activeView})) return redirectView(views[0].MfViewId)
    // if (activeModal && !getModalComponent(activeModal)) redirectView(activeView)
  }

  render () {
    const {activeView, activeModal, actionButton, mapboxToken, classes, views, switchView, closeModal, appBarMenuItems,
      detailViewButtons, settingsTab, appBarButtons, appBarTitle, willPrint, paperSize, cancelPrint, changePaperSize} = this.props
    const ViewComponent = getViewComponent(activeView, views)

    return (
      <div className={classes.outer}>
        <AppBar
          views={views}
          activeView={activeView}
          onChangeTab={switchView}
          buttons={appBarButtons}
          menuItems={appBarMenuItems}
          title={appBarTitle} />
        <div className={classes.inner}>
          <ConnectFilterPane />
          <div className={classes.view}>
            <ViewContainer component={ViewComponent} mapboxToken={mapboxToken} />
          </div>
          {actionButton && <div className={classes.actionButton}>{createElement(actionButton)}</div>}
        </div>
        <Dialog
          onClose={closeModal}
          open={activeModal === 'feature'}
          fullWidth
          maxWidth='md'
          classes={{root: classes.modalRoot, paper: classes.modalPaper, paperWidthMd: classes.modalPaperMd}}>
          <FeatureDetail detailViewButtons={detailViewButtons} onRequestClose={closeModal} />}
        </Dialog>
        <Dialog
          onClose={closeModal}
          open={activeModal === 'settings'}
          fullWidth
          classes={{root: classes.modalRoot, paper: classes.modalPaper}}>
          <Settings activeTabId={settingsTab} onRequestClose={closeModal} />}
        </Dialog>
        <PrintDialog
          onClose={cancelPrint}
          open={willPrint}
          onChangePaperSize={changePaperSize}
          paperSize={paperSize} />
      </div>
    )
  }
}

App.defaultProps = {
  views: [MapView, MediaView, ReportView],
  activeView: 'map'
}

function getViewComponent (activeView, views) {
  var view = find(views, {MfViewId: activeView})
  if (!view) return () => <div />
  return view
}

export default connect(
  (state) => assign({}, state.ui || {}, state.print),
  (dispatch) => bindActionCreators(actionCreators, dispatch)
)(withStyles(styles)(App))
