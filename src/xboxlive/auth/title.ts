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
    DeviceToken: Runtypes.String,
    RpsTicket: Runtypes.String,
    SiteName: Runtypes.String
  }),
  RelyingParty: Runtypes.String,
  TokenType: Runtypes.Literal('JWT')
})

router.post('/title/authenticate', (req, res) => {
  const request = AuthenticateRequest.validate(req.body)
  if (!request.success) {
    res.status(400)
    res.end()
    return
  }

  const { issued, expires } = utils.validityDatePair(config.xboxlive.tokenValidityMinutes)
  const token: TokenTypes.Xbox.TitleToken = {
    type: 'title',
    tid: '2037747551'
  }

  res.send({
    IssueInstant: issued,
    NotAfter: expires,
    Token: jwt.sign(token, config.xboxlive.authTokenSecret, issued, expires),
    DisplayClaims: {
      xti: {
        tid: token.tid
      }
    }
  })
})

export = router