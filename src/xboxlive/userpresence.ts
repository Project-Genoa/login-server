import * as Runtypes from 'runtypes'
import Express from 'express'
const router = Express.Router()

import * as jwt from '../jwt'
import TokenTypes from '../token_types'
import * as utils from '../utils'

import config from '../config'

router.post('/users/:xuid/devices/current/titles/current', (req, res) => {
  const authorization = utils.parseXboxAuthorization(req.header('Authorization'))
  if (authorization == null) {
    res.status(400)
    res.end()
    return
  }
  const token = jwt.verify<TokenTypes.Xbox.XapiToken>(authorization.tokenString, config.xboxlive.xapiTokenSecret)?.data
  if (token == null || token.userId != authorization.userId) {
    res.status(401)
    res.end()
    return
  }

  const xuid = (req.params['xuid'].match(/^xuid\((.*)\)$/) ?? [null, null])[1]
  if (xuid == null) {
    res.status(400)
    res.end()
    return
  }
  if (xuid != token.userId) {
    res.status(401)
    res.end()
    return
  }

  // TODO

  res.end()
})

// TODO

export = router