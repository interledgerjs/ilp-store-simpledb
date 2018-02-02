const aws = require('aws-lib')
const request = require('superagent')
const debug = require('debug')('simpledb-store')
const CREDENTIALS_ENDPOINT = 'http://169.254.169.254/latest/meta-data/iam/security-credentials/'
const EXPIRY_BUFFER = 1000 * 60 * 60

const START_DELAY = 250
const MAX_DELAY = 5000

class SimpleDBStore {
  constructor ({
    accessKey,
    secret,
    domain,
    token,
    host,
    role
  }) {
    this._domain = domain || 'ILP'
    this._host = host

    this._accessKey = accessKey
    this._secret = secret
    this._token = token

    this._role = role
    this._expiry = null
  }

  async _loadCredentials (force = false) {
    if (!force && this._sdb && (!this._expiry || Date.now() < (this._expiry - EXPIRY_BUFFER))) {
      return
    }

    if (this._role) {
      const response = await request
        .get(CREDENTIALS_ENDPOINT + this._role)
      const credentials = JSON.parse(response.text)

      this._accessKey = credentials.AccessKeyId
      this._secret = credentials.SecretAccessKey
      this._token = credentials.Token
      this._expiry = Date.parse(credentials.Expiration)
    }

    // TODO: should secure be set or not?
    this._sdb = aws.createSimpleDBClient(this._accessKey, this._secret, {
      token: this._token,
      host: this._host,
      secure: false,
    })
  }

  async _call (action, params, delay = START_DELAY) {
    await this._loadCredentials()
    return new Promise((resolve, reject) => {
      this._sdb.call(action, params, (err, res) => {
        if (err) {
          return reject(err)
        }
        resolve(res)
      })
    }).catch(async e => {
      // if the token gets out of date somehow, then force a reload of it
      if (e.message === 'The security token included in the request is expired') {
        await this._loadCredentials(true)
      }

      if (delay > MAX_DELAY) throw e
      await new Promise(resolve => setTimeout(resolve, delay))
      return this._call(action, params, delay * 2)
    })
  }

  async get (key) {
    const res = await this._call('GetAttributes', {
      ItemName: key,
      DomainName: this._domain
    })

    debug('response:',res)
    const attribute = res.GetAttributesResult.Attribute
    return attribute && attribute.Value
  }

  async put (key, value) {
    return this._call('PutAttributes', {
      ItemName: key,
      DomainName: this._domain,
      'Attribute.1.Name': 'value',
      'Attribute.1.Value': value,
      'Attribute.1.Replace': true
    })
  }

  async del (key) {
    return this._call('DeleteAttributes', {
      ItemName: key,
      DomainName: this._domain
    })
  }
}

module.exports = SimpleDBStore
