import Express from 'express'
const router = Express.Router()

router.use('/www', require('./www'))

export = router