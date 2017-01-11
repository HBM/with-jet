import { connect } from 'react-redux'
import { fetch, unfetch } from 'redux-jet'
import React from 'react'

const fetchActions = {
  fetch,
  unfetch
}

const withJet = (mapStateToConnection, fetchers = {}) => {
  return Component => connect(mapStateToConnection, fetchActions)(class extends React.Component {
    fetchAll (connection) {
      Object.keys(fetchers).forEach(fetchId => {
        this.props.fetch(connection, fetchers[fetchId], fetchId)
      })
    }

    unfetchAll (connection) {
      Object.keys(fetchers).forEach(fetchId => {
        this.props.unfetch(connection, fetchId)
      })
    }

    componentWillReceiveProps (props) {
      if (JSON.stringify(props.connection) !== JSON.stringify(this.props.connection)) {
        this.unfetchAll(this.props.connection)
        this.fetchAll(props.connection)
      }
    }

    componentWillMount () {
      this.fetchAll(this.props.connection)
    }

    componentWillUnmount () {
      this.unfetchAll(this.props.connection)
    }

    render () {
      return <Component {...this.props} />
    }
  })
}

export default withJet
