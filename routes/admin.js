import express from 'express';
import { getAllBookings, loginAdmin, createAdmin, deleteBooking, updateBookingStatus } from '../controllers/adminController.js';
import { adminAuth, superAdminAuth } from '../middlewares/adminAuth.js';

const route = express.Router();

route.post('/login', loginAdmin);
route.post('/create', superAdminAuth, createAdmin);
route.get('/bookings', adminAuth, getAllBookings);
route.delete('/bookings/:id', superAdminAuth, deleteBooking);
route.get('/bookings/:id/update-status', updateBookingStatus); // email action link — secured by signed token

export { route as adminRoute };
