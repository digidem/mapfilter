const features = (state = [], action) => {
  switch (action.type) {
    case 'ADD_FEATURES':
      return [...state, ...action.payload]
    case 'REPLACE_FEATURES':
      return action.payload
  }
  return state
}

module.exports = features
