const React = require('react')
const { Provider } = require('react-redux')
const { createStore, applyMiddleware, compose } = require('redux')
const thunk = require('redux-thunk').default
const Router = require('react-router/BrowserRouter').default
const getMuiTheme = require('material-ui/styles/getMuiTheme').default
const MuiThemeProvider = require('material-ui/styles/MuiThemeProvider').default
const {IntlProvider} = require('react-intl-redux')
const {addLocaleData} = require('react-intl')
const en = require('react-intl/locale-data/en')
const es = require('react-intl/locale-data/es')

addLocaleData([...en, ...es])

const MFPropTypes = require('./util/prop_types')
const IndexRoute = require('./containers/index_route')
const reducers = require('./reducers')
const { replaceFeatures } = require('./action_creators')

// Roboto font
require('../css/fonts.css')
require('../css/animations.css')

// Needed by material-ui for onTouchTap to work
require('react-tap-event-plugin')()

// Attach Chrome devTools extensions if it is present.
const devTools = window.devToolsExtension ? window.devToolsExtension() : undefined
const storeEnhancer = devTools ? compose(devTools, applyMiddleware(thunk)) : applyMiddleware(thunk)

class MapFilter extends React.Component {
  static propTypes = {
    features: MFPropTypes.features
  }

  static defaultProps = {
    features: []
  }

  constructor (props) {
    super(props)
    const initialState = {features: props.features}
    this.store = createStore(reducers, initialState, storeEnhancer)
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.features === this.props.features) return
    this.store.dispatch(replaceFeatures(nextProps.features))
  }

  render () {
    return <Provider store={this.store}>
      <IntlProvider>
        <MuiThemeProvider muiTheme={getMuiTheme()}>
          <Router>
            {routerProps => <IndexRoute {...routerProps} />}
          </Router>
        </MuiThemeProvider>
      </IntlProvider>
    </Provider>
  }
}

module.exports = MapFilter
