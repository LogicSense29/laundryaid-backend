import express from 'express'
import { addRequest } from '../controllers/requestController.js'

const route = express.Router()

route.post('/add_request', addRequest)


export {route as requestRoute}