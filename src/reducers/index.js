import {combineReducers} from 'redux'
import {intlReducer} from 'react-intl-redux'

import features from './features'
import filters from './filters'
import filterFields from './filter_fields'
import mapViewState from './map_view_state'
import mapStyle from './map_style'
import ui from './ui'
import fieldMapping from './field_mapping'
import fieldOrder from './field_order'
import fieldTypes from './field_types'
import resizer from './resizer'
import settings from './settings'
import print from './print'
import viewStates from './view_states'

export default combineReducers({
  features,
  filters,
  filterFields,
  mapViewState,
  mapStyle,
  ui,
  print,
  fieldMapping,
  fieldOrder,
  fieldTypes,
  intl: intlReducer,
  resizer,
  settings,
  viewStates
})
