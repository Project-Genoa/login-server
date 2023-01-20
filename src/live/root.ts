import * as Runtypes from 'runtypes'
import Express from 'express'
const router = Express.Router()

router.get('/ppcrlconfig600.xml', (req, res) => {
  // instead of returning the config data we can just return 404 and the client will use the built-in config
  res.status(404)
  res.end()
})

export = router