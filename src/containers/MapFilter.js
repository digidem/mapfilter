import PropTypes from 'prop-types'
import React from 'react'
import { Provider } from 'react-redux'
import { createStore, applyMiddleware, compose } from 'redux'
import thunk from 'redux-thunk'
import {IntlProvider} from 'react-intl'
import pick from 'lodash/pick'
import merge from 'lodash/merge'
import shallowEqual from 'shallow-equal/objects'
import {persistStore, autoRehydrate} from 'redux-persist'
import localForage from 'localforage'
import assign from 'object-assign'

import App from './App'
import * as MFPropTypes from '../util/prop_types'
import {capitalize} from '../util/text_helpers'
import reducers from '../reducers'
import controlledStore from '../controlled_store'
import config from '../../config.json'
import stateReconciler from '../util/stateReconciler'

import esStrings from '../../locales/es.json'
import frStrings from '../../locales/fr.json'

var translations = {
  es: {
    locale: 'es',
    messages: Object.keys(esStrings).reduce((messages, id) => {
      messages[id] = esStrings[id].message
      return messages
    }, {})
  },
  fr: {
    locale: 'fr',
    messages: Object.keys(frStrings).reduce((messages, id) => {
      messages[id] = frStrings[id].message
      return messages
    }, {})
  }
}

// Roboto font
require('../../css/fonts.css')

// Attach Chrome devTools extensions if it is present.
let composeEnhancers = compose
if (process.env.NODE_ENV !== 'production' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) {
  composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
}

const reduxPersistOptions = {
  storage: localForage,
  blacklist: [
    'features',
    'ui',
    'mapStyle',
    'resizer',
    'intl'
  ],
  debounce: 500
}

const controllableProps = [
  'filters',
  'filterFields',
  'features',
  'mapPosition',
  'mapStyle',
  'fieldTypes',
  'fieldOrder',
  'ui',
  'resizer',
  'fieldMapping'
]

const storeEnhancer = composeEnhancers(
  applyMiddleware(thunk),
  autoRehydrate({stateReconciler: stateReconciler(controllableProps)})
)

const initialState = {}

class MapFilter extends React.Component {
  static propTypes = {
    /**
     * A unique identifier for a dataset. react-mapfilter persists settings (current filters, map locations).
     * Use `datasetName` to namespace saved settings - e.g. if the dataset is different, use a different `datasetname`
     * default: `default`
     */
    datasetName: PropTypes.string,
    /**
     * Override the default translations mapping.
     */
    translations: PropTypes.object,
    /**
     * An object of filters
     * Default: `{}`
     */
    filters: PropTypes.object,
    /**
     * Called whenever filters are changed
     * with a new array of filter objects.
    */
    onChangeFilters: PropTypes.func,
    /**
     * Called whenever filters are changed
     * with a new array of filter objects.
    */
    onChangeFilterFields: PropTypes.func,
    /**
     * An array of filter fields
     * Default: `[]`
     */
    filterFields: PropTypes.array,
    /**
     * An array of GeoJSON Feature objects
     * Default: `[]`
     */
    features: MFPropTypes.features.isRequired,
    /**
     * Called whenever features are changed (added or edited)
     * with a new array of feature objects. Use shallow equality
     * checks to get changes.
     */
    onChangeFeatures: PropTypes.func.isRequired,
    /**
     * An array of buttons for the detail view
     */
    detailViewButtons: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.element, PropTypes.func])),
    /**
     * Configure which fields are used for the title and subtitle field.
     */
    fieldMapping: MFPropTypes.fieldMapping,
    /**
     * Called whenever the field mapping is changed
     */
    onChangeFieldMapping: PropTypes.func,
    /**
     * A Mapbox Style document https://www.mapbox.com/mapbox-gl-js/style-spec/
     * or a URL pointing to a style JSON
     * Default: `mapbox://styles/mapbox/streets-v9`
     */
    mapStyle: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    /**
     * Override the field types of properties on features
     */
    fieldTypes: PropTypes.objectOf(PropTypes.string),
    /**
     * A floating action button to render in the bottom-right corner
     * https://material.io/guidelines/components/buttons-floating-action-button.html
     * Either a React Element (`<MyActionButton myProp='hello' />`)
     * or a React Component (`MyActionButton`)
     * Default: `null`
     */
    actionButton: PropTypes.oneOfType([PropTypes.element, PropTypes.func]),
    /**
     * A function to return a URL to a resized version of an image. It will be passed
     * the URL to the original image, and the desired size, and should return a
     * URL to a resized version of the image. Default: `src => src`
     */
    resizer: PropTypes.func,
    /**
     * An array of views. Each view should have a static property `MfViewId` which
     * is used for the tab name (and translation)
     * Default: `['MapView', 'MediaView', 'ReportView']`
     */
    views: PropTypes.arrayOf(PropTypes.func),
    /**
     * Array of buttons to render on the right-side of the AppBar.
     * Either a React Element (`<MyButton myProp='hello' />`)
     * or a React Component (`MyButton`)
     */
    appBarButtons: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.element, PropTypes.func])),
    /**
     * App title to render on left-side of the AppBar. Can be anything that can be rendered
     * (numbers, strings, elements or an array containing these types)
     * Default: `'MapFilter'`
     */
    appBarTitle: PropTypes.node,
    /**
     * Menu items to render at the end of the AppBar menu.
     * Either a React Element (`<MyMenuItem myProp='hello' />`)
     * or a React Component (`MyMenuItem`)
     */
    appBarMenuItems: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.element, PropTypes.func])),
    /**
     * A locale string that is optional, overriding the default navigator locale.
     */
    locale: PropTypes.string,
    /**
     * Buttons to render on a view toolbar. An array of objects with a `MfViewId` prop
     * that matches the MfViewId of the view where the button should appear, and a prop
     * `button` which should be either a React Element (`<MyToolbarButton myProp='hello' />`)
     * or a React Component (`MyToolbarButton`)
     */
    viewToolbarButtons: PropTypes.arrayOf(PropTypes.shape({
      MfViewId: PropTypes.string.isRequired,
      button: PropTypes.oneOfType([PropTypes.element, PropTypes.func])
    })),
    /**
     * An array of controls to add to the map. Each control should implement
     * the IControl interface of mapbox-gl-js https://www.mapbox.com/mapbox-gl-js/api/#icontrol
     * To set the position of the control, add a `getDefaultPosition()` method.
     */
    mapControls: PropTypes.arrayOf(PropTypes.shape({
      onAdd: PropTypes.func.isRequired,
      onRemove: PropTypes.func.isRequired
    }))
  }

  static defaultProps = {
    features: [],
    mapStyle: config.defaultMapStyle,
    resizer: src => src,
    locale: navigator.language.slice(0, 2),
    actionButton: null,
    datasetName: 'default'
  }

  handleChange = (key, value) => {
    var propName = 'onChange' + capitalize(key)
    if (typeof this.props[propName] !== 'function') return
    this.props[propName](value)
  }

  constructor (props) {
    super(props)
    const stateOverride = pick(props, controllableProps)
    const controlledStoreEnhancer = controlledStore(this.handleChange, stateOverride)
    var lang = this.props.locale
    if (this.props.translations) merge(translations, this.props.translations)
    if (translations[lang]) {
      initialState.intl = translations[lang]
    }
    this.store = createStore(reducers, initialState, compose(controlledStoreEnhancer, storeEnhancer))
    persistStore(this.store, assign({}, reduxPersistOptions, {
      keyPrefix: 'reduxPersist:' + props.datasetName + ':'
    }))
  }

  componentWillReceiveProps (nextProps) {
    if (shallowEqual(this.props, nextProps)) return
    const stateOverride = pick(nextProps, controllableProps)
    this.store.controlledUpdate(stateOverride)
  }

  render () {
    const {actionButton, detailViewButtons, views, appBarButtons, appBarMenuItems, appBarTitle, locale, mapControls} = this.props
    return <Provider store={this.store}>
      <IntlProvider locale={locale} >
        <App detailViewButtons={detailViewButtons} appBarMenuItems={appBarMenuItems}
          actionButton={actionButton} views={views} appBarButtons={appBarButtons} appBarTitle={appBarTitle} mapControls={mapControls} />
      </IntlProvider>
    </Provider>
  }
}

export default MapFilter
