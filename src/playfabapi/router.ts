import Express from 'express'
const router = Express.Router()

router.use('/:playfabId', require('./playfabapi'))

export = router