import crypto from 'crypto'

import * as Runtypes from 'runtypes'
import Express from 'express'
const router = Express.Router()

import * as jwt from '../jwt'
import TokenTypes from '../token_types'
import * as utils from '../utils'

import XML from '../xml'
const namespaces = {
  S: 'http://www.w3.org/2003/05/soap-envelope',
  wsse: 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd',
  wsu: 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd',
  wsp: 'http://schemas.xmlsoap.org/ws/2004/09/policy',
  wst: 'http://schemas.xmlsoap.org/ws/2005/02/trust',
  wssc: 'http://schemas.xmlsoap.org/ws/2005/02/sc',
  wsa: 'http://www.w3.org/2005/08/addressing',
  ps: 'http://schemas.microsoft.com/Passport/SoapServices/PPCRL',
  psf: 'http://schemas.microsoft.com/Passport/SoapServices/SOAPFault',
  e: 'http://www.w3.org/2001/04/xmlenc#',
  ds: 'http://www.w3.org/2000/09/xmldsig#'
}

import config from '../config'

router.use('/ppsecure/login', Express.urlencoded({ extended: false }))
router.use('/ppsecure/reauthenticate', Express.urlencoded({ extended: false }))
router.use('/', Express.text({ type: '*/*' }))

router.get('/ppsecure/InlineConnect.srf', (req, res) => {
  res.sendFile('./login.html', { root: './static' })
})

router.get('/ppsecure/reauthenticateStart', (req, res) => {
  res.sendFile('./reauthenticate.html', { root: './static' })
})

router.get('/ppsecure/jquery-3.6.3.min.js', (req, res) => {
  res.sendFile('./jquery-3.6.3.min.js', { root: './static' })
})

const LoginRequest = Runtypes.Record({
  username: Runtypes.String.withConstraint(value => value.trim().length > 0),
  password: Runtypes.String.withConstraint(value => value.length > 0)
})

router.post('/ppsecure/login', (req, res) => {
  const request = LoginRequest.validate(req.body)
  if (!request.success) {
    res.status(400)
    res.end()
    return
  }

  const username = request.value.username
  const password = request.value.password
  const userId = config.login.useStableUserIds ? crypto.createHash('md5').update(Buffer.from(request.value.username, 'utf8')).digest().subarray(0, 8).toString('hex') : crypto.randomBytes(8).toString('hex')
  const passwordSalt = crypto.randomBytes(16)
  const passwordHash = crypto.scryptSync(Buffer.from(password, 'utf8'), passwordSalt, 64)

  const tokenValidity = utils.validityDatePair(config.login.userTokenValidityMinutes)
  const token: TokenTypes.Live.UserToken = {
    userId: userId,
    username: username,
    passwordSalt: passwordSalt.toString('base64'),
    passwordHash: passwordHash.toString('base64')
  }
  const tokenString = jwt.sign(token, config.login.userTokenSecret, tokenValidity.issued, tokenValidity.expires)

  res.send({
    userId: userId,
    username: username,
    token: tokenString,
    tokenIssuedAt: tokenValidity.issued.toISOString(),
    tokenExpires: tokenValidity.expires.toISOString(),
    sessionKey: config.login.userTokenSessionKey
  })
})

const ReauthenticateRequest = Runtypes.Record({
  userToken: Runtypes.String,
  password: Runtypes.String.withConstraint(value => value.length > 0)
})

router.post('/ppsecure/reauthenticate', (req, res) => {
  const request = ReauthenticateRequest.validate(req.body)
  if (!request.success) {
    res.status(400)
    res.end()
    return
  }

  const existingToken = jwt.verify<TokenTypes.Live.UserToken>(request.value.userToken, config.login.userTokenSecret, true)
  if (existingToken == null) {
    res.status(403)
    res.end()
    return
  }
  const passwordCheckHash = crypto.scryptSync(Buffer.from(request.value.password, 'utf8'), Buffer.from(existingToken.data.passwordSalt, 'base64'), 64)
  if (passwordCheckHash.toString('base64') != existingToken.data.passwordHash) {
    res.status(403)
    res.end()
    return
  }

  const tokenValidity = utils.validityDatePair(config.login.userTokenValidityMinutes)
  const tokenString = jwt.sign(existingToken.data, config.login.userTokenSecret, tokenValidity.issued, tokenValidity.expires)

  res.send({
    userId: existingToken.data.userId,
    username: existingToken.data.username,
    token: tokenString,
    tokenIssuedAt: tokenValidity.issued.toISOString(),
    tokenExpires: tokenValidity.expires.toISOString(),
    sessionKey: config.login.userTokenSessionKey
  })
})

router.post('/ppsecure/deviceaddcredential.srf', (req, res) => {
  res.send(`<DeviceAddResponse Success="true"><success>true</success><puid>0</puid></DeviceAddResponse>`)
})

router.post('/RST2.srf', (req, res) => {
  const request = XML.parse(req.body, namespaces)
  if (request == null) {
    res.status(400)
    res.end()
    return
  }

  if (request.evaluate('/S:Envelope/S:Body/wst:RequestSecurityToken', 'node') != null) {
    // device token request

    const username = request.evaluate('/S:Envelope/S:Header/wsse:Security/wsse:UsernameToken/wsse:Username/text()', 'string')
    const password = request.evaluate('/S:Envelope/S:Header/wsse:Security/wsse:UsernameToken/wsse:Password/text()', 'string')

    const requestType = request.evaluate('/S:Envelope/S:Body/wst:RequestSecurityToken/wst:RequestType/text()', 'string')
    const appliesTo = request.evaluate('/S:Envelope/S:Body/wst:RequestSecurityToken/wsp:AppliesTo/wsa:EndpointReference/wsa:Address/text()', 'string')

    if (requestType != 'http://schemas.xmlsoap.org/ws/2005/02/trust/Issue' || appliesTo != 'http://Passport.NET/tb') {
      res.status(400)
      res.end()
      return
    }

    const headerValidity = utils.validityDatePair(config.login.soapHeaderValidityMinutes)

    const deviceTokenValidity = utils.validityDatePair(config.login.deviceTokenValidityMinutes)
    const deviceToken: TokenTypes.Live.DeviceToken = {}
    const deviceTokenString = jwt.sign<TokenTypes.Live.DeviceToken>(deviceToken, config.login.deviceTokenSecret, deviceTokenValidity.issued, deviceTokenValidity.expires)

    const response = XML.emptyDocument('S', 'Envelope', namespaces)
    response.evaluate('/S:Envelope', 'node')?.appendChild(response.createElement('S', 'Header'))
    response.evaluate('/S:Envelope/S:Header', 'node')?.appendChild(response.createElement('wsse', 'Security')).appendChild(response.createElement('wsu', 'Timestamp'))
    response.evaluate('/S:Envelope/S:Header/wsse:Security/wsu:Timestamp', 'node')?.appendChild(response.createElement('wsu', 'Created')).append(headerValidity.issued.toISOString())
    response.evaluate('/S:Envelope/S:Header/wsse:Security/wsu:Timestamp', 'node')?.appendChild(response.createElement('wsu', 'Expires')).append(headerValidity.expires.toISOString())
    response.evaluate('/S:Envelope/S:Header', 'node')?.appendChild(response.createElement('psf', 'pp'))
    response.evaluate('/S:Envelope', 'node')?.appendChild(response.createElement('S', 'Body'))
    response.evaluate('/S:Envelope/S:Body', 'node')?.appendChild(response.createElement('wst', 'RequestSecurityTokenResponse'))
    response.evaluate('/S:Envelope/S:Body/wst:RequestSecurityTokenResponse', 'node')?.appendChild(response.createElement('wst', 'TokenType')).append('urn:passport:legacy')
    response.evaluate('/S:Envelope/S:Body/wst:RequestSecurityTokenResponse', 'node')?.appendChild(response.createElement('wsp', 'AppliesTo')).appendChild(response.createElement('wsa', 'EndpointReference')).appendChild(response.createElement('wsa', 'Address')).append('http://Passport.NET/tb')
    response.evaluate('/S:Envelope/S:Body/wst:RequestSecurityTokenResponse', 'node')?.appendChild(response.createElement('wst', 'Lifetime'))
    response.evaluate('/S:Envelope/S:Body/wst:RequestSecurityTokenResponse/wst:Lifetime', 'node')?.appendChild(response.createElement('wsu', 'Created')).append(deviceTokenValidity.issued.toISOString())
    response.evaluate('/S:Envelope/S:Body/wst:RequestSecurityTokenResponse/wst:Lifetime', 'node')?.appendChild(response.createElement('wsu', 'Expires')).append(deviceTokenValidity.expires.toISOString())
    response.evaluate('/S:Envelope/S:Body/wst:RequestSecurityTokenResponse', 'node')?.appendChild(response.createElement('wst', 'RequestedSecurityToken'))
    response.evaluate('/S:Envelope/S:Body/wst:RequestSecurityTokenResponse/wst:RequestedSecurityToken', 'node')?.appendChild(response.createElement('e', 'EncryptedData', true))
    response.evaluate('/S:Envelope/S:Body/wst:RequestSecurityTokenResponse/wst:RequestedSecurityToken/e:EncryptedData', 'node')?.appendChild(response.createElement('e', 'CipherData', true)).appendChild(response.createElement('e', 'CipherValue', true)).append(deviceTokenString);
    (response.evaluate('/S:Envelope/S:Body/wst:RequestSecurityTokenResponse/wst:RequestedSecurityToken/e:EncryptedData', 'node') as Element).setAttribute('Id', 'BinaryDAToken0')
    response.evaluate('/S:Envelope/S:Body/wst:RequestSecurityTokenResponse', 'node')?.appendChild(response.createElement('wst', 'RequestedProofToken'))
    response.evaluate('/S:Envelope/S:Body/wst:RequestSecurityTokenResponse/wst:RequestedProofToken', 'node')?.appendChild(response.createElement('wst', 'BinarySecret')).append('0000')

    res.send(response.toString())
    return
  }
  else if (request.evaluate('/S:Envelope/S:Body/ps:RequestMultipleSecurityTokens', 'node') != null) {
    // user token request (user token + device token -> next user token + next session key + xbox token)

    const userTokenString = request.evaluate('/S:Envelope/S:Header/wsse:Security/e:EncryptedData[@id="BinaryDAToken0"]/e:CipherData/e:CipherValue/text()', 'string')
    const deviceDATokenString = request.evaluate('/S:Envelope/S:Header/wsse:Security/wsse:BinarySecurityToken[@id="DeviceDAToken"]/text()', 'string')
    const deviceDATokenXMLStringEncoded: string | null = (deviceDATokenString.match(/&da=([^&]*)/) ?? [null, null])[1]
    const deviceDATokenXMLString = deviceDATokenXMLStringEncoded != null ? decodeURIComponent(deviceDATokenXMLStringEncoded) : null
    const deviceTokenString = XML.parse(deviceDATokenXMLString, namespaces)?.evaluate('/e:EncryptedData/e:CipherData/e:CipherValue/text()', 'string') ?? ''

    const requestCount = request.evaluate('count(/S:Envelope/S:Body/ps:RequestMultipleSecurityTokens/*)', 'number')
    const requestType1 = request.evaluate('/S:Envelope/S:Body/ps:RequestMultipleSecurityTokens/wst:RequestSecurityToken[1]/wst:RequestType/text()', 'string')
    const appliesTo1 = request.evaluate('/S:Envelope/S:Body/ps:RequestMultipleSecurityTokens/wst:RequestSecurityToken[1]/wsp:AppliesTo/wsa:EndpointReference/wsa:Address/text()', 'string')
    const requestType2 = request.evaluate('/S:Envelope/S:Body/ps:RequestMultipleSecurityTokens/wst:RequestSecurityToken[2]/wst:RequestType/text()', 'string')
    const appliesTo2 = request.evaluate('/S:Envelope/S:Body/ps:RequestMultipleSecurityTokens/wst:RequestSecurityToken[2]/wsp:AppliesTo/wsa:EndpointReference/wsa:Address/text()', 'string')

    if (requestCount != 2 || requestType1 != 'http://schemas.xmlsoap.org/ws/2005/02/trust/Issue' || appliesTo1 != 'http://Passport.NET/tb' || requestType2 != 'http://schemas.xmlsoap.org/ws/2005/02/trust/Issue' || appliesTo2 != 'cobrandid=90023&scope=service%3A%3Auser.auth.xboxlive.com%3A%3Ambi_ssl') {
      res.status(400)
      res.end()
      return
    }

    const userToken = jwt.verify<TokenTypes.Live.UserToken>(userTokenString, config.login.userTokenSecret, true)
    const deviceToken = jwt.verify<TokenTypes.Live.DeviceToken>(deviceTokenString, config.login.deviceTokenSecret, true)

    if (userToken == null || userToken.expired) {
      const headerValidity = utils.validityDatePair(config.login.soapHeaderValidityMinutes)
      const nonce = generateNonce()

      const reauthenticateURL = userToken != null ?
        `${config.environment.protocol}://login.${config.environment.liveBaseHost}:${config.environment.port}/ppsecure/reauthenticateStart?username=${encodeURIComponent(userToken.data.username)}&userToken=${encodeURIComponent(userTokenString)}` :
        `${config.environment.protocol}://login.${config.environment.liveBaseHost}:${config.environment.port}/ppsecure/InlineConnect.srf`
      const reauthenticateURLDocument = XML.emptyDocument('psf', 'pp', namespaces)
      reauthenticateURLDocument.evaluate('/psf:pp', 'node')?.appendChild(reauthenticateURLDocument.createElement('psf', 'inlineauthurl')).append(reauthenticateURL)
      const reauthenticateURLDocumentCipherText = doAESEncryption(config.login.userTokenSessionKey, nonce, reauthenticateURLDocument.toString())

      const response = XML.emptyDocument('S', 'Envelope', namespaces)
      response.evaluate('/S:Envelope', 'node')?.appendChild(response.createElement('S', 'Header'))
      response.evaluate('/S:Envelope/S:Header', 'node')?.appendChild(response.createElement('wsse', 'Security')).appendChild(response.createElement('wsu', 'Timestamp'))
      response.evaluate('/S:Envelope/S:Header/wsse:Security/wsu:Timestamp', 'node')?.appendChild(response.createElement('wsu', 'Created')).append(headerValidity.issued.toISOString())
      response.evaluate('/S:Envelope/S:Header/wsse:Security/wsu:Timestamp', 'node')?.appendChild(response.createElement('wsu', 'Expires')).append(headerValidity.expires.toISOString())
      response.evaluate('/S:Envelope/S:Header/wsse:Security', 'node')?.appendChild(response.createElement('wssc', 'DerivedKeyToken'));
      (response.evaluate('/S:Envelope/S:Header/wsse:Security/wssc:DerivedKeyToken', 'node') as Element).setAttributeNodeNS(response.createAttribute('wsu', 'Id', 'EncKey'));
      (response.evaluate('/S:Envelope/S:Header/wsse:Security/wssc:DerivedKeyToken', 'node') as Element).setAttribute('Algorithm', 'urn:liveid:SP800-108CTR-HMAC-SHA256')
      response.evaluate('/S:Envelope/S:Header/wsse:Security/wssc:DerivedKeyToken', 'node')?.appendChild(response.createElement('wssc', 'Nonce')).append(nonce)
      response.evaluate('/S:Envelope/S:Header', 'node')?.appendChild(response.createElement('psf', 'EncryptedPP')).appendChild(response.createElement('e', 'EncryptedData', true));
      (response.evaluate('/S:Envelope/S:Header/psf:EncryptedPP/e:EncryptedData', 'node') as Element).setAttribute('Id', 'EncPsf');
      (response.evaluate('/S:Envelope/S:Header/psf:EncryptedPP/e:EncryptedData', 'node') as Element).setAttribute('Type', 'http://www.w3.org/2001/04/xmlenc#Element')
      response.evaluate('/S:Envelope/S:Header/psf:EncryptedPP/e:EncryptedData', 'node')?.appendChild(response.createElement('e', 'EncryptionMethod', true));
      (response.evaluate('/S:Envelope/S:Header/psf:EncryptedPP/e:EncryptedData/e:EncryptionMethod', 'node') as Element).setAttribute('Algorithm', 'http://www.w3.org/2001/04/xmlenc#aes256-cbc')
      response.evaluate('/S:Envelope/S:Header/psf:EncryptedPP/e:EncryptedData', 'node')?.appendChild(response.createElement('ds', 'KeyInfo', true)).appendChild(response.createElement('wsse', 'SecurityTokenReference')).appendChild(response.createElement('wsse', 'Reference'));
      (response.evaluate('/S:Envelope/S:Header/psf:EncryptedPP/e:EncryptedData/ds:KeyInfo/wsse:SecurityTokenReference/wsse:Reference', 'node') as Element).setAttribute('URI', '#EncKey')
      response.evaluate('/S:Envelope/S:Header/psf:EncryptedPP/e:EncryptedData', 'node')?.appendChild(response.createElement('e', 'CipherData', true)).appendChild(response.createElement('e', 'CipherValue', true)).append(reauthenticateURLDocumentCipherText);
      response.evaluate('/S:Envelope', 'node')?.appendChild(response.createElement('S', 'Body'))
      response.evaluate('/S:Envelope/S:Body', 'node')?.appendChild(response.createElement('S', 'Fault')).appendChild(response.createElement('S', 'Detail')).appendChild(response.createElement('psf', 'error'))
      response.evaluate('/S:Envelope/S:Body/S:Fault/S:Detail/psf:error', 'node')?.appendChild(response.createElement('psf', 'value')).append('0')
      response.evaluate('/S:Envelope/S:Body/S:Fault/S:Detail/psf:error', 'node')?.appendChild(response.createElement('psf', 'internalerror')).appendChild(response.createElement('psf', 'code')).append('0')

      res.send(response.toString())
      return
    }
    else {
      const headerValidity = utils.validityDatePair(config.login.soapHeaderValidityMinutes)
      const nonce = generateNonce()

      const nextUserTokenValidity = utils.validityDatePair(config.login.userTokenValidityMinutes)
      const nextUserToken: TokenTypes.Live.UserToken = userToken.data
      const nextUserTokenString = jwt.sign(nextUserToken, config.login.userTokenSecret, nextUserTokenValidity.issued, nextUserTokenValidity.expires)

      const xboxTokenValidity = utils.validityDatePair(config.login.xboxTokenValidityMinutes)
      const xboxToken: TokenTypes.Shared.XboxTicketToken = { userId: userToken.data.userId, username: userToken.data.username }
      const xboxTokenString = jwt.sign(xboxToken, config.login.xboxTokenSecret, xboxTokenValidity.issued, xboxTokenValidity.expires)

      const nextSessionKey = config.login.userTokenSessionKey

      const tokenDocument = XML.emptyDocument('wst', 'RequestSecurityTokenResponseCollection', namespaces)
      tokenDocument.evaluate('/wst:RequestSecurityTokenResponseCollection', 'node')?.appendChild(tokenDocument.createElement('wst', 'RequestSecurityTokenResponse'))
      tokenDocument.evaluate('/wst:RequestSecurityTokenResponseCollection/wst:RequestSecurityTokenResponse[1]', 'node')?.appendChild(tokenDocument.createElement('wst', 'TokenType')).append('urn:passport:legacy')
      tokenDocument.evaluate('/wst:RequestSecurityTokenResponseCollection/wst:RequestSecurityTokenResponse[1]', 'node')?.appendChild(tokenDocument.createElement('wsp', 'AppliesTo')).appendChild(tokenDocument.createElement('wsa', 'EndpointReference')).appendChild(tokenDocument.createElement('wsa', 'Address')).append('http://Passport.NET/tb')
      tokenDocument.evaluate('/wst:RequestSecurityTokenResponseCollection/wst:RequestSecurityTokenResponse[1]', 'node')?.appendChild(tokenDocument.createElement('wst', 'Lifetime'))
      tokenDocument.evaluate('/wst:RequestSecurityTokenResponseCollection/wst:RequestSecurityTokenResponse[1]/wst:Lifetime', 'node')?.appendChild(tokenDocument.createElement('wsu', 'Created')).append(nextUserTokenValidity.issued.toISOString())
      tokenDocument.evaluate('/wst:RequestSecurityTokenResponseCollection/wst:RequestSecurityTokenResponse[1]/wst:Lifetime', 'node')?.appendChild(tokenDocument.createElement('wsu', 'Expires')).append(nextUserTokenValidity.expires.toISOString())
      tokenDocument.evaluate('/wst:RequestSecurityTokenResponseCollection/wst:RequestSecurityTokenResponse[1]', 'node')?.appendChild(tokenDocument.createElement('wst', 'RequestedSecurityToken'))
      tokenDocument.evaluate('/wst:RequestSecurityTokenResponseCollection/wst:RequestSecurityTokenResponse[1]/wst:RequestedSecurityToken', 'node')?.appendChild(tokenDocument.createElement('e', 'EncryptedData', true))
      tokenDocument.evaluate('/wst:RequestSecurityTokenResponseCollection/wst:RequestSecurityTokenResponse[1]/wst:RequestedSecurityToken/e:EncryptedData', 'node')?.appendChild(tokenDocument.createElement('e', 'CipherData', true)).appendChild(tokenDocument.createElement('e', 'CipherValue', true)).append(nextUserTokenString);
      (tokenDocument.evaluate('/wst:RequestSecurityTokenResponseCollection/wst:RequestSecurityTokenResponse[1]/wst:RequestedSecurityToken/e:EncryptedData', 'node') as Element).setAttribute('Id', 'BinaryDAToken0')
      tokenDocument.evaluate('/wst:RequestSecurityTokenResponseCollection/wst:RequestSecurityTokenResponse[1]', 'node')?.appendChild(tokenDocument.createElement('wst', 'RequestedProofToken'))
      tokenDocument.evaluate('/wst:RequestSecurityTokenResponseCollection/wst:RequestSecurityTokenResponse[1]/wst:RequestedProofToken', 'node')?.appendChild(tokenDocument.createElement('wst', 'BinarySecret')).append(nextSessionKey)
      tokenDocument.evaluate('/wst:RequestSecurityTokenResponseCollection', 'node')?.appendChild(tokenDocument.createElement('wst', 'RequestSecurityTokenResponse'))
      tokenDocument.evaluate('/wst:RequestSecurityTokenResponseCollection/wst:RequestSecurityTokenResponse[2]', 'node')?.appendChild(tokenDocument.createElement('wst', 'TokenType')).append('urn:passport:compact')
      tokenDocument.evaluate('/wst:RequestSecurityTokenResponseCollection/wst:RequestSecurityTokenResponse[2]', 'node')?.appendChild(tokenDocument.createElement('wsp', 'AppliesTo')).appendChild(tokenDocument.createElement('wsa', 'EndpointReference')).appendChild(tokenDocument.createElement('wsa', 'Address')).append('cobrandid=90023&scope=service%3A%3Auser.auth.xboxlive.com%3A%3Ambi_ssl')
      tokenDocument.evaluate('/wst:RequestSecurityTokenResponseCollection/wst:RequestSecurityTokenResponse[2]', 'node')?.appendChild(tokenDocument.createElement('wst', 'Lifetime'))
      tokenDocument.evaluate('/wst:RequestSecurityTokenResponseCollection/wst:RequestSecurityTokenResponse[2]/wst:Lifetime', 'node')?.appendChild(tokenDocument.createElement('wsu', 'Created')).append(xboxTokenValidity.issued.toISOString())
      tokenDocument.evaluate('/wst:RequestSecurityTokenResponseCollection/wst:RequestSecurityTokenResponse[2]/wst:Lifetime', 'node')?.appendChild(tokenDocument.createElement('wsu', 'Expires')).append(xboxTokenValidity.expires.toISOString())
      tokenDocument.evaluate('/wst:RequestSecurityTokenResponseCollection/wst:RequestSecurityTokenResponse[2]', 'node')?.appendChild(tokenDocument.createElement('wst', 'RequestedSecurityToken'))
      tokenDocument.evaluate('/wst:RequestSecurityTokenResponseCollection/wst:RequestSecurityTokenResponse[2]/wst:RequestedSecurityToken', 'node')?.appendChild(tokenDocument.createElement('wsse', 'BinarySecurityToken')).append(xboxTokenString);
      (tokenDocument.evaluate('/wst:RequestSecurityTokenResponseCollection/wst:RequestSecurityTokenResponse[2]/wst:RequestedSecurityToken/wsse:BinarySecurityToken', 'node') as Element).setAttribute('Id', 'Compact1')
      const tokenDocumentCipherText = doAESEncryption(config.login.userTokenSessionKey, nonce, tokenDocument.toString())

      const response = XML.emptyDocument('S', 'Envelope', namespaces)
      response.evaluate('/S:Envelope', 'node')?.appendChild(response.createElement('S', 'Header'))
      response.evaluate('/S:Envelope/S:Header', 'node')?.appendChild(response.createElement('wsse', 'Security')).appendChild(response.createElement('wsu', 'Timestamp'))
      response.evaluate('/S:Envelope/S:Header/wsse:Security/wsu:Timestamp', 'node')?.appendChild(response.createElement('wsu', 'Created')).append(headerValidity.issued.toISOString())
      response.evaluate('/S:Envelope/S:Header/wsse:Security/wsu:Timestamp', 'node')?.appendChild(response.createElement('wsu', 'Expires')).append(headerValidity.expires.toISOString())
      response.evaluate('/S:Envelope/S:Header/wsse:Security', 'node')?.appendChild(response.createElement('wssc', 'DerivedKeyToken'));
      (response.evaluate('/S:Envelope/S:Header/wsse:Security/wssc:DerivedKeyToken', 'node') as Element).setAttributeNodeNS(response.createAttribute('wsu', 'Id', 'EncKey'));
      (response.evaluate('/S:Envelope/S:Header/wsse:Security/wssc:DerivedKeyToken', 'node') as Element).setAttribute('Algorithm', 'urn:liveid:SP800-108CTR-HMAC-SHA256')
      response.evaluate('/S:Envelope/S:Header/wsse:Security/wssc:DerivedKeyToken', 'node')?.appendChild(response.createElement('wssc', 'Nonce')).append(nonce)
      response.evaluate('/S:Envelope', 'node')?.appendChild(response.createElement('S', 'Body'))
      response.evaluate('/S:Envelope/S:Body', 'node')?.appendChild(response.createElement('e', 'EncryptedData', true));
      (response.evaluate('/S:Envelope/S:Body/e:EncryptedData', 'node') as Element).setAttribute('Id', 'RSTR');
      (response.evaluate('/S:Envelope/S:Body/e:EncryptedData', 'node') as Element).setAttribute('Type', 'http://www.w3.org/2001/04/xmlenc#Element')
      response.evaluate('/S:Envelope/S:Body/e:EncryptedData', 'node')?.appendChild(response.createElement('e', 'EncryptionMethod', true));
      (response.evaluate('/S:Envelope/S:Body/e:EncryptedData/e:EncryptionMethod', 'node') as Element).setAttribute('Algorithm', 'http://www.w3.org/2001/04/xmlenc#aes256-cbc')
      response.evaluate('/S:Envelope/S:Body/e:EncryptedData', 'node')?.appendChild(response.createElement('ds', 'KeyInfo', true)).appendChild(response.createElement('wsse', 'SecurityTokenReference')).appendChild(response.createElement('wsse', 'Reference'));
      (response.evaluate('/S:Envelope/S:Body/e:EncryptedData/ds:KeyInfo/wsse:SecurityTokenReference/wsse:Reference', 'node') as Element).setAttribute('URI', '#EncKey')
      response.evaluate('/S:Envelope/S:Body/e:EncryptedData', 'node')?.appendChild(response.createElement('e', 'CipherData', true)).appendChild(response.createElement('e', 'CipherValue', true)).append(tokenDocumentCipherText);

      res.send(response.toString())
      return
    }
  }
  else {
    res.status(400)
    res.end()
    return
  }
})

function generateNonce(): string {
  return crypto.randomBytes(32).toString('base64')
}

function doAESEncryption(sessionKeyBase64: string, nonceBase64: string, plainText: string): string {
  const sessionKey = Buffer.from(sessionKeyBase64, 'base64')
  const nonce = Buffer.from(nonceBase64, 'base64')
  const plainTextBytes = Buffer.from(plainText, 'utf8')

  const hmac = crypto.createHmac('sha256', sessionKey)
  hmac.update(Buffer.from([0, 0, 0, 1]))
  hmac.update(Buffer.from('WS-SecureConversationWS-SecureConversation', 'utf8'))
  hmac.update(Buffer.from([0]))
  hmac.update(nonce)
  hmac.update(Buffer.from([0, 0, 1, 0]))
  const messageKey = hmac.digest()

  const iv = crypto.randomBytes(16)

  const cipher = crypto.createCipheriv('aes-256-cbc', messageKey, iv)
  const cipherText = Buffer.concat([iv, cipher.update(plainTextBytes), cipher.final()])

  return cipherText.toString('base64')
}

export = router