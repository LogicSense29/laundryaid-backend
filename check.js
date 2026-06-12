import jwt from 'jsonwebtoken';
import db from './model/db/db.js';

async function run() {
  // Email we know exists: oluwabukolaodunsi29@gmail.com -> user_id: 029a058e-69ef-4e13-9787-a8579eeda676
  const email = 'oluwabukolaodunsi29@gmail.com';
  const knownUserId = '029a058e-69ef-4e13-9787-a8579eeda676';

  // 1. Simulate what otpLogin does - sign token with customer.user_id
  const token = jwt.sign({ id: knownUserId }, 'to_mosthigh_be_the_glory', { expiresIn: '2d' });
  
  // 2. Simulate what auth middleware does - decode and set req.user_id
  const decoded = jwt.verify(token, 'to_mosthigh_be_the_glory');
  console.log('req.user_id will be set to:', decoded.id);

  // 3. Simulate what getUserBookings does
  const { rows: bookings } = await db.query(
    `SELECT r.request_id, r.user_id FROM request r WHERE r.user_id = $1 LIMIT 5`,
    [decoded.id]
  );
  console.log('Bookings for this user_id:', bookings.length, bookings);

  // 4. For comparison, what does request table have?
  const { rows: allReqs } = await db.query(
    `SELECT DISTINCT user_id FROM request LIMIT 5`
  );
  console.log('Distinct user_ids in request table:', allReqs);

  process.exit(0);
}
run();
