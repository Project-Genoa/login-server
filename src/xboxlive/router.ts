import Express from 'express'
const router = Express.Router()

router.use('/mgt/title', require('./title_mgt'))
router.use('/auth', require('./auth'))
router.use('/accounts', require('./accounts'))
router.use('/profile', require('./profile'))
//router.use('/privacy', require('./privacy'))
//router.use('/userpresence', require('./userpresence'))

export = router