import Express from 'express'
import vhost from 'vhost'

import config from './config'

const app = Express()

app.use('/', require('./log'))

function hostnameToPath(hostname: string): string {
  return '/' + hostname.split('.').reverse().join('/')
}

function rewrite(req: Express.Request, res: Express.Response, next: Express.NextFunction) {
  if (config.environment.singleDomainMode != null) {
    const match = req.url.match(/^\/([^\/]*)(\/.*)$/)
    if (match != null) {
      req.url = hostnameToPath(match[1]) + match[2]
    }
  }
  else {
    req.url = hostnameToPath(req.hostname) + req.url
  }
  next()
}
app.use('/', rewrite)

app.use('/', Express.json())

app.use(hostnameToPath(config.environment.xboxliveBaseHost), require('./xboxlive/router'))
app.use(hostnameToPath(config.environment.playfabapiBaseHost), require('./playfabapi/router'))
//app.use(hostnameToPath(config.environment.xboxabBaseHost), require('./xboxab/router'))
app.use(hostnameToPath(config.environment.liveBaseHost), require('./live/router'))

const port = config.environment.port
app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})