import Express from 'express'
const router = Express.Router()

import config from '../config'

router.get('/titles/:title/endpoints', (req, res) => {
  if (req.params.title == 'default') {
    res.send({
      EndPoints: [
        config.environment.singleDomainMode != null ? {
          Protocol: config.environment.protocol,
          Host: config.environment.singleDomainMode,
          Port: config.environment.port,
          HostType: config.environment.singleDomainMode.match(/^[0-9]*\.[0-9]*\.[0-9]*\.[0-9]*$/) != null ? 'ip' : 'fqdn',
          RelyingParty: 'http://xboxlive.com',
          TokenType: 'JWT'
        } : {
          Protocol: config.environment.protocol,
          Host: '*.' + config.environment.xboxliveBaseHost,
          Port: config.environment.port,
          HostType: 'wildcard',
          RelyingParty: 'http://xboxlive.com',
          TokenType: 'JWT'
        },
        {
          Protocol: 'https',
          Host: 'xboxlive.com',
          HostType: 'fqdn',
          RelyingParty: 'http://xboxlive.com',
          TokenType: 'JWT'
        }
      ]
    })
  }
  else if (req.params.title == '2037747551') {
    res.send({
      EndPoints: [
        {
          Protocol: 'https',
          Host: '*.playfabapi.com',
          HostType: 'wildcard',
          RelyingParty: 'https://b980a380.minecraft.playfabapi.com/',
          TokenType: 'JWT'
        }/*,
        {
          Protocol: 'https',
          Host: '*.commerce.gameservices.com',
          HostType: 'wildcard',
          RelyingParty: 'https://minecraft.commerce.microsoftstudios.com/',
          TokenType: 'JWT'
        }*/
      ]
    })
  }
  else {
    res.status(400)
    res.end()
  }
})

export = router