import * as Runtypes from 'runtypes'
import Express from 'express'
const router = Express.Router()

import * as jwt from '../../jwt'
import TokenTypes from '../../token_types'
import * as utils from '../../utils'

import config from '../../config'

const AuthenticateRequest = Runtypes.Record({
  Properties: Runtypes.Record({
    AuthMethod: Runtypes.Literal('RPS'),
    RpsTicket: Runtypes.String,
    SiteName: Runtypes.String
  }),
  RelyingParty: Runtypes.String,
  TokenType: Runtypes.Literal('JWT')
})

router.post('/device/authenticate', (req, res) => {
  const request = AuthenticateRequest.validate(req.body)
  if (!request.success) {
    res.status(400)
    res.end()
    return
  }

  const { issued, expires } = utils.validityDatePair(config.xboxlive.tokenValidityMinutes)
  const token: TokenTypes.Xbox.DeviceToken = {
    type: 'device',
    did: 'F700F376F3793B3A' // TODO
  }

  res.send({
    IssueInstant: issued,
    NotAfter: expires,
    Token: jwt.sign(token, config.xboxlive.authTokenSecret, issued, expires),
    DisplayClaims: {
      xdi: {
        did: token.did
      }
    }
  })
})

export = router