import Express from 'express'
const router = Express.Router()

router.use('/user', require('./auth/user'))
router.use('/device', require('./auth/device'))
router.use('/title', require('./auth/title'))
router.use('/xsts', require('./auth/xsts'))

export = router