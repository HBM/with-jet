/* globals describe it before after */
import assert from 'assert'
import withJet from '../src'
import React from 'react'
import {mount} from 'enzyme'
import {single} from 'redux-jet'
import {connect} from 'react-redux'
import {combineReducers} from 'redux'
import configureStore from './_configureStore'
import jet from 'node-jet'

const Component = ({admin, foo}) => <h1>{admin}{foo}</h1>
const Container = connect(({admin, foo}) => ({admin, foo}))(Component)

describe('withJet', () => {
  let daemon
  let peer

  const users = {
    john: {
      password: '12345',
      auth: {
        fetchGroups: ['users']
      }
    },
    admin: {
      password: '333',
      auth: {
        fetchGroups: ['users', 'admin']
      }
    }
  }

  before(() => {
    daemon = new jet.Daemon({users})
    daemon.listen({wsPort: 1999})
    peer = new jet.Peer({url: 'ws://localhost:1999'})
    const s1 = new jet.State('foo/bar', 123, {fetchGroups: ['users']})
    const s2 = new jet.State('admin/stuff', 'secret', {fetchGroups: ['admin']})
    return Promise.all([
      peer.connect(),
      peer.add(s1),
      peer.add(s2)
    ])
  })

  after(() => {
    peer.closed().then(() => {
      daemon.wsServer.close()
    })
    peer.close()
  })

  it('should be a function', () => {
    assert.equal(typeof withJet, 'function')
  })

  it('should wrap elements', () => {
    const store = configureStore(() => {})
    const WithJet = withJet(state => ({}))(() => <h1>hello</h1>)
    const wrapper = mount(<WithJet store={store} />)
    assert.equal(wrapper.text(), 'hello')
  })

  it('should provide the fetchers content', done => {
    const store = configureStore(combineReducers({foo: single('foo')}))
    const fetchers = {
      foo: {path: {startsWith: 'foo'}}
    }
    const connection = {url: 'ws://localhost:1999', user: 'john', password: '12345'}
    const ComponentWithJet = withJet(state => ({connection}), fetchers)(Container)
    const wrapper = mount(<ComponentWithJet store={store} />)
    let once
    store.subscribe(() => {
      if (store.getState().foo && !once) {
        assert.equal(store.getState().foo, 123)
        assert.equal(wrapper.find('h1').text(), '123')
        wrapper.unmount()
        once = true
        done()
      }
    })
  })

  it('should properly connection / user change', done => {
    const connection = {url: 'ws://localhost:1999', user: 'john', password: '12345'}
    const store = configureStore(combineReducers({
      admin: single('admin'),
      foo: single('foo'),
      connection: (state = connection, action) => (
        action.type === 'SET_CONNECTION' ? action.connection : state
      )
    }))
    const fetchers = {
      admin: {path: {startsWith: 'admin'}},
      foo: {path: {startsWith: 'foo'}}
    }
    const mapStateToConnection = state => ({
      connection: state.connection
    })
    const ComponentWithJet = withJet(mapStateToConnection, fetchers)(Container)
    const wrapper = mount(<ComponentWithJet store={store} />)
    let wasJohn
    let once
    store.subscribe(() => {
      const state = store.getState()
      const user = state.connection.user
      if (user === 'john' && state.foo) {
        wasJohn = true
        assert.equal(state.foo, 123)
        assert(!state.admin)
        assert.equal(wrapper.find('h1').text(), '123')
        store.dispatch({
          type: 'SET_CONNECTION',
          connection: {url: 'ws://localhost:1999', user: 'admin', password: '333'}
        })
      } else if (user === 'admin' && state.admin && !once) {
        assert.equal(state.admin, 'secret')
        assert.equal(wrapper.find('h1').text(), 'secret123')
        assert(wasJohn)
        once = true
        done()
      }
    })
  })
})
