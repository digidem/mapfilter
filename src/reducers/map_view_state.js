import assign from 'object-assign'

const mapViewState = (state = {}, action) => {
  switch (action.type) {
    case 'MOVE_MAP':
      return assign({}, state, action.payload)
    default:
      return state
  }
}

export default mapViewState
