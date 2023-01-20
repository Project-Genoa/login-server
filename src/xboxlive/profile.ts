import assert from 'assert'

import * as Runtypes from 'runtypes'
import Express from 'express'
const router = Express.Router()

import * as jwt from '../jwt'
import TokenTypes from '../token_types'
import * as utils from '../utils'

import config from '../config'

function getProfile(token: TokenTypes.Xbox.XapiToken): { [field: string]: string } {
  return {
    AppDisplayName: token.username,
    AppDisplayPicRaw: config.xboxlive.profileFields.pictureURL,
    GameDisplayName: token.username,
    GameDisplayPicRaw: config.xboxlive.profileFields.pictureURL,
    Gamertag: token.username,
    Gamerscore: '0',
    FirstName: config.xboxlive.profileFields.firstName,
    LastName: config.xboxlive.profileFields.lastName,
    SpeechAccessibility: ''
  }
}

function getProfileFields(token: TokenTypes.Xbox.XapiToken, fields: string[]): { id: string, value: string }[] {
  const profile = getProfile(token)
  return fields.filter(field => field in profile).map(field => { return { id: field, value: profile[field] } })
}

router.get('/users/:gt/profile/settings', (req, res) => {
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

  const gt = req.params['gt'] == 'me' ? token.username : (req.params['gt'].match(/^gt\((.*)\)$/) ?? [null, null])[1]
  if (gt == null) {
    res.status(400)
    res.end()
    return
  }
  if (gt != token.username) {
    res.status(401)
    res.end()
    return
  }

  const settings = typeof req.query['settings'] == 'string' ? req.query['settings'].split(',') : null
  if (settings == null) {
    res.status(400)
    res.end()
    return
  }

  res.send({
    profileUsers: [
      {
        id: token.userId,
        hostId: token.userId,
        settings: getProfileFields(token, settings),
        isSponsoredUser: false
      }
    ]
  })
})

const BatchProfileSettingsRequest = Runtypes.Record({
  /*settings: Runtypes.Array(Runtypes.Union(
    Runtypes.Literal('AppDisplayName'),
    Runtypes.Literal('AppDisplayPicRaw'),
    Runtypes.Literal('GameDisplayName'),
    Runtypes.Literal('GameDisplayPicRaw'),
    Runtypes.Literal('Gamerscore'),
    Runtypes.Literal('Gamertag'),
    Runtypes.Literal('SpeechAccessibility')
  )),*/
  settings: Runtypes.Array(Runtypes.String),
  userIds: Runtypes.Array(Runtypes.String)
})

router.post('/users/batch/profile/settings', (req, res) => {
  const request = BatchProfileSettingsRequest.validate(req.body)
  if (!request.success) {
    res.status(400)
    res.end()
    return
  }

  const authorization = utils.parseXboxAuthorization(req.header('Authorization'))
  if (authorization == null) {
    res.status(400)
    res.end()
    return
  }
  const token = jwt.verify<TokenTypes.Xbox.XapiToken>(authorization.tokenString, config.xboxlive.authTokenSecret)?.data
  if (token == null || token.userId != authorization.userId) {
    res.status(401)
    res.end()
    return
  }

  for (const userId of request.value.userIds) {
    if (userId != token.userId) {
      res.status(401)
      res.end()
      return
    }
  }

  res.send({
    profileUsers: request.value.userIds.map(userId => {
      return {
        id: userId,
        hostId: userId,
        settings: userId == token.userId ? getProfileFields(token, request.value.settings) : assert(false),
        isSponsoredUser: false
      }
    })
  })
})

export = router