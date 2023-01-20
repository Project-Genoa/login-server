import Express from 'express'

const pathExcludePatterns: string[] = [
  //
]

function log(req: Express.Request, res: Express.Response, next: Express.NextFunction) {
  const host = req.hostname
  const path = req.url
  const ip = req.ip
  var exclude = false
  pathExcludePatterns.forEach(pattern => exclude = exclude || !!path.match(pattern))
  if (!exclude) {
    console.log(new Date(), `Request for ${host} ${path}`)
  }
  next()
}

export = log