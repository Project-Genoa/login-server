import * as Runtypes from 'runtypes'
import Express from 'express'
const router = Express.Router()

import * as jwt from '../jwt'
import TokenTypes from '../token_types'
import * as utils from '../utils'

import config from '../config'

router.get('/users/current/profile', (req, res) => {
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

  res.send({
    gamerTag: null,
    midasConsole: null,
    touAcceptanceDate: '0001-01-01T00:00:00',
    gamerTagChangeReason: null,
    dateOfBirth: '0001-01-01T00:00:00',
    dateCreated: '0001-01-01T00:00:00',
    email: null,
    firstName: null,
    homeAddressInfo: null,
    homeConsole: null,
    imageUrl: null,
    isAdult: true,
    lastName: null,
    legalCountry: null,
    locale: null,
    msftOptin: null,
    ownerHash: null,
    ownerXuid: null,
    partnerOptin: null,
    requirePasskeyForPurchase: false,
    requirePasskeyForSignIn: false,
    subscriptionEntitlementInfo: null,
    userHash: token.userId,
    userKey: null,
    userXuid: 0
  })
})

export = router