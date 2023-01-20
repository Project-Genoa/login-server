import Express from 'express'
const router = Express.Router()

router.use('/login', require('./login'))
router.use('/', require('./root'))

export = router