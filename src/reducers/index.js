import {combineReducers} from 'redux'
import {intlReducer} from 'react-intl-redux'

import features from './features'
import filters from './filters'
import filterFields from './filter_fields'
import mapPosition from './map_position'
import mapStyle from './map_style'
import ui from './ui'
import fieldMapping from './field_mapping'
import fieldOrder from './field_order'
import fieldTypes from './field_types'
import resizer from './resizer'
import settings from './settings'
import print from './print'
import viewStates from './view_states'
import layers from './layers'
import onChangeLayers from './onChangeLayers'

export default combineReducers({
  features,
  filters,
  layers,
  filterFields,
  mapPosition,
  mapStyle,
  ui,
  print,
  fieldMapping,
  fieldOrder,
  onChangeLayers,
  fieldTypes,
  intl: intlReducer,
  resizer,
  settings,
  viewStates
})
