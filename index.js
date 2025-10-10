import express from 'express'
import cors from 'cors'
import { requestRoute } from './routes/request.js'
import db from './model/db/db.js';
import https from "https";
const app = express()
const PORT = process.env.PORT 

//middlewares
app.use(
  cors({
    origin: [
      "https://laundryaid.com.ng",
      "http://localhost:5174",
      "http://192.168.44.14:5174",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());
app.use('/api', requestRoute)

const keepAppAlive = () => {
  setInterval(() => {
    https.get("https://laundryaid-backend.onrender.com");
    console.log("⏱️ App pinged to stay alive");
  }, 1000 * 60 * 5); // every 5 minutes
};

//Nuber of visits
app.post("/api/track-visit", async (req, res) => {
        await db.query("INSERT INTO visits DEFAULT VALUES");
        res.sendStatus(200);
      });
            
keepAppAlive();



app.listen(PORT, ()=> {
        console.log('APP LISTENING ON PORT:', PORT)
})