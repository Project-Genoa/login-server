import * as Runtypes from 'runtypes'
import Express from 'express'
const router = Express.Router()

import * as jwt from '../../jwt'
import TokenTypes from '../../token_types'
import * as utils from '../../utils'

import config from '../../config'

const AuthorizeRequest = Runtypes.Record({
  Properties: Runtypes.Record({
    SandboxId: Runtypes.Literal('RETAIL'),
    DeviceToken: Runtypes.String,
    TitleToken: Runtypes.String,
    UserTokens: Runtypes.Array(Runtypes.String),
  }),
  RelyingParty: Runtypes.String,
  TokenType: Runtypes.Literal('JWT')
})

router.post('/xsts/authorize', (req, res) => {
  const request = AuthorizeRequest.validate(req.body)
  if (!request.success) {
    res.status(400)
    res.end()
    return
  }

  if (request.value.Properties.UserTokens.length != 1) {
    res.status(400)
    res.end()
    return
  }
  const deviceToken: TokenTypes.Xbox.AuthToken | undefined = jwt.verify<TokenTypes.Xbox.AuthToken>(request.value.Properties.DeviceToken, config.xboxlive.authTokenSecret)?.data
  const titleToken: TokenTypes.Xbox.AuthToken | undefined = jwt.verify<TokenTypes.Xbox.AuthToken>(request.value.Properties.TitleToken, config.xboxlive.authTokenSecret)?.data
  const userToken: TokenTypes.Xbox.AuthToken | undefined = jwt.verify<TokenTypes.Xbox.AuthToken>(request.value.Properties.UserTokens[0], config.xboxlive.authTokenSecret)?.data
  if (deviceToken == null || deviceToken.type != 'device' || titleToken == null || titleToken.type != 'title' || userToken == null || userToken.type != 'user') {
    res.status(401)
    res.end()
    return
  }

  if (request.value.RelyingParty == 'http://xboxlive.com') {
    const { issued, expires } = utils.validityDatePair(config.xboxlive.tokenValidityMinutes)
    const token: TokenTypes.Xbox.XapiToken = {
      userId: userToken.userId,
      username: userToken.username
    }

    res.send({
      IssueInstant: issued,
      NotAfter: expires,
      Token: jwt.sign(token, config.xboxlive.xapiTokenSecret, issued, expires),
      DisplayClaims: {
        xui: [
          {
            xid: userToken.xid,
            uhs: userToken.uhs,

            gtg: userToken.username,
            agg: 'Adult'
          }
        ]
      }
    })
  }
  else if (request.value.RelyingParty == 'http://events.xboxlive.com') {
    const { issued, expires } = utils.validityDatePair(config.xboxlive.tokenValidityMinutes)
    const token: TokenTypes.Xbox.XapiToken = {
      userId: userToken.userId,
      username: userToken.username
    }

    res.send({
      IssueInstant: issued,
      NotAfter: expires,
      Token: jwt.sign(token, config.xboxlive.xapiTokenSecret, issued, expires),
      DisplayClaims: {
        xui: [
          {
            uhs: userToken.uhs
          }
        ]
      }
    })
  }
  else if (request.value.RelyingParty == 'https://b980a380.minecraft.playfabapi.com/') {
    const { issued, expires } = utils.validityDatePair(config.xboxlive.tokenValidityMinutes)
    const token: TokenTypes.Shared.PlayfabXboxToken = {
      userId: userToken.userId
    }

    res.send({
      IssueInstant: issued,
      NotAfter: expires,
      Token: jwt.sign(token, config.xboxlive.playfabTokenSecret, issued, expires),
      DisplayClaims: {
        xui: [
          {
            uhs: userToken.uhs
          }
        ]
      }
    })
  }
  else {
    res.status(400)
    res.end()
  }
})

export = router