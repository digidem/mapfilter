const React = require('react')
const ReactDOM = require('react-dom')
const MapFilter = require('../src/index.js').default
const createHistory = require('history').createBrowserHistory
const { MuiThemeProvider, createMuiTheme } = require('@material-ui/core/styles')
const blue = require('@material-ui/core/colors/blue').default
const pink = require('@material-ui/core/colors/pink').default
const MenuItem = require('@material-ui/core/MenuItem').default
const { randomPoint } = require('@turf/random')
const {LinearInterpolator, FlyToInterpolator} = require('react-map-gl')
const d3 = require('d3-ease')

const theme = createMuiTheme({
  palette: {
    primary: blue,
    secondary: pink
  }
})

const fieldOrder = {caption: 1, public: 0}

const MAPBOX_TOKEN = require('../config.json').mapboxToken

const features = require('./sample.json').features

const history = createHistory()

const pathRegExp = /^(?:\/((?:[^/]+?)))?(?:\/((?:[^/]+?)))?(?:\/((?:[^/]+?)))?(?:\/(?=$))?$/

function uiFromPath (path) {
  const match = pathRegExp.exec(path)
  if (!match) return {}
  return {
    activeView: match[1],
    activeModal: match[2] && match[2].replace('features', 'feature'),
    settingsTab: match[2] === 'settings' && match[3],
    featureId: match[2] === 'features' && match[3]
  }
}

function pathFromUi (ui) {
  let path = '/'
  if (ui.activeView) path += ui.activeView + '/'
  if (ui.activeModal === 'settings') path += 'settings/' + ui.settingsTab + '/'
  if (ui.activeModal === 'feature') path += 'features/' + ui.featureId + '/'
  return path
}

function resizer (src, size) {
  return 'https://resizer.digital-democracy.org/{width}/{height}/{url}'
    .replace('{width}', size)
    .replace('{height}', size)
    .replace('{url}', src)
}

const MyMenuItem = () => (
  <MenuItem onClick={() => console.log('click myMenu')}>
    Custom Menu Item
  </MenuItem>
)

class Example extends React.Component {
  constructor (props) {
    super(props)
    this.history = createHistory()
    this.unlisten = history.listen(this.handleHistoryChange)
    this.state = {
      ui: uiFromPath(history.location.pathname),
      features: features
    }
  }
  componentDidMount () {
    this.intervalId = setTimeout(() => {
      const coords = randomPoint(1, {bbox: [-76.65, -16.96, -51.92, 6.64]}).features[0].geometry.coordinates
      console.log('fly to', coords)
      console.log('from', this.state.mapViewState)
      this.setState(state => ({
        mapViewState: Object.assign({}, this.state.mapViewState, {
          longitude: coords[0],
          latitude: coords[1],
          zoom: 10,
          transitionInterpolator: new LinearInterpolator(),
          transitionDuration: 1000,
          transitionEasing: d3.easeCubic
        })
      }))
    }, 10000)
  }
  handleHistoryChange = (location, action) => {
    if (action === 'POP') {
      this.setState({ui: uiFromPath(location.pathname)})
    }
  }
  handleChangeUi = (ui) => {
    const path = pathFromUi(ui)
    ui.amberirect ? history.replace(path) : history.push(path)
    this.setState({ui})
  }
  handleChangeFeatures = (_) => {
    this.setState({features: _})
  }
  handleChangeMapViewState = (pos) => {
    this.setState({mapViewState: pos})
  }
  render () {
    return <MuiThemeProvider theme={theme}>
      <MapFilter
        mapViewState={this.state.mapViewState}
        mapboxToken={MAPBOX_TOKEN}
        onChangeMapViewState={this.handleChangeMapViewState}
        resizer={resizer}
        features={this.state.features}
        fieldOrder={fieldOrder}
        ui={this.state.ui}
        onChangeUi={this.handleChangeUi}
        onChangeFeatures={this.handleChangeFeatures}
        appBarMenuItems={[MyMenuItem]} />
    </MuiThemeProvider>
  }
}

ReactDOM.render(<Example />, document.getElementById('root'))
