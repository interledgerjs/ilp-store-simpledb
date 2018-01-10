const aws = require('aws-lib')

class SimpleDBStore {
  constructor ({
    accessKey,
    secret,
    domain
  }) {
    // TODO: should secure be set or not?
    this._sdb = aws.createSimpleDBClient(accessKey, secret, { secure: false })
    this._domain = domain
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

  get (key) {
    const res = await this._call('GetAttributes', {
      ItemName: key,
      DomainName: this._domain
    })

    return res.GetAttributesResult.Attribute[0].Value
  }

  set (key, value) {
    return this._call('PutAttributes', {
      ItemName: key,
      Domain: this._domain,
      'Attribute.1.Name': 'value',
      'Attribute.1.Value': value
    })
  }

  del (key) {
    return this._call('DeleteAttributes', {
      ItemName: key,
      Domain: this._domain
    })
  }
}
