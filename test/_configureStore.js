import {createStore, applyMiddleware} from 'redux'
import thunk from 'redux-thunk'

const configureStore = (reducers) => {
  const middlewares = [thunk]

  return createStore(
      reducers,
      applyMiddleware(...middlewares)
  )
}

export default configureStore
