import express from 'express'
import { addRequest } from '../controllers/requestController.js'
import { limitPickupRequest } from '../middlewares/limitRequest.js'
import { promoCodeCheck } from '../controllers/voucherController.js'
import { countRequest } from '../controllers/countRequestController.js'

const route = express.Router()

route.post('/add_request', addRequest)
route.get('/count_request', countRequest)
route.post('/promo_code', promoCodeCheck)


export {route as requestRoute}