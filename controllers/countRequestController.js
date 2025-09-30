// booking.controller.js
// export const countRequest = async (req, res) => {
//   const { dateTime, userId } = req.body;

//   Count how many bookings exist for this datetime
//   const { rows } = await pool.query(
//     "SELECT COUNT(*) FROM requests WHERE date_time = $1",
//     [dateTime]
//   );

// const query = `SELECT COUNT(*)
// FROM requests
// WHERE DATE(pickup_date) = CURRENT_DATE`;

//   const { rows } = await pool.query(
//     query
//   );


//   if (parseInt(rows[0].count) >= 30) {
//     return res.status(400).json({ error: "This slot is fully booked" });
//   }

//   If under 30, insert booking
//   await pool.query(
//     "INSERT INTO bookings (user_id, date_time) VALUES ($1, $2)",
//     [userId, dateTime]
//   );

//   res.status(200).json({ success: true, message: "Booking available!" });
// };

// booking.controller.js
import db from "../model/db/db.js";

export const countRequest = async (req, res) => {
  try {
    // const query = `
    //   SELECT COUNT(*) 
    //   FROM request 
    //   WHERE DATE(pickup_date) = CURRENT_DATE
    // `;

    // const { rows } = await db.query(query);
    // console.log(rows)

    // const total = parseInt(rows[0].count, 10);

    // if (total >= 30) {
    //   return res.status(400).json({ error: "This slot is fully booked" });
    // }

    // const date = new Date(recentDate);
    // const nextDate = new Date(date)
    // nextDate.setDate(date.getDate() + 1)

  //     const query = `
  //   SELECT d.pickup_date, b.pickup_date
  //   FROM (
  //     SELECT (CURRENT_DATE + i)::date AS pickup_date
  //     FROM generate_series(0, 60) i   -- check next 60 days
  //   ) d
  //   LEFT JOIN request b 
  //   ON b.pickup_date = d.pickup_date
  //   GROUP BY d.pickup_date, b.pickup_date
  //   HAVING COUNT(b.request_id) < 30           -- max 30 bookings per day
  //   ORDER BY d.pickup_date
  //   ;
  // `;

  const userLocalDate = new Date().toLocaleDateString("en-CA"); 

  const query = `SELECT d.pickup_date
FROM (
    SELECT ((CURRENT_DATE + i)::timestamp AT TIME ZONE 'UTC+1') AS pickup_date
    FROM generate_series(0, 60) i
) d
LEFT JOIN request b ON b.pickup_date::date = d.pickup_date::date
GROUP BY d.pickup_date
HAVING COUNT(b.request_id) < 30
ORDER BY d.pickup_date;`;

  // const query = `
  // SELECT pickup_date FROM request WHERE NOW() = pickup_date`
      const today = new Date();
      const result = await db.query(query);
      const date = result.rows.length > 0 ? result.rows[0].pickup_date : today;

      // console.log(result);
      // console.log(userLocalDate)

    res.status(200).json({ message: "Booking available!", date : date });
  } catch (err) {
    console.error("Error checking booking availability:", err);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

// SELECT ((CURRENT_DATE + i)::timestamp AT TIME ZONE 'UTC+1') AS pickup_date
// SELECT (CURRENT_DATE + i)::date AS pickup_date