const aws = require('aws-lib')

class SimpleDBStore {
  constructor ({
    accessKey,
    secret,
    domain
  }) {
    // TODO: should secure be set or not?
    this._sdb = aws.createSimpleDBClient(accessKey, secret, { secure: false })
    this._domain = domain || 'ILP'
  }

  // TODO: how to handle any failures?
  async _call (action, params) {
    return new Promise((resolve, reject) => {
      this._sdb.call(action, params, (err, res) => {
        if (err) {
          return reject(err)
        }
        resolve(res)
      })
    })
  }

  async get (key) {
    const res = await this._call('GetAttributes', {
      ItemName: key,
      DomainName: this._domain
    })

    console.log('got:',res)
    return res.GetAttributesResult.Attribute.Value
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
      Domain: this._domain
    })
  }
}

module.exports = SimpleDBStore
