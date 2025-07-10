import express from 'express'
import { addRequest } from '../controllers/requestController.js'
import { limitPickupRequest } from '../middlewares/limitRequest.js'

const route = express.Router()

route.post('/add_request', limitPickupRequest, addRequest)


export {route as requestRoute}