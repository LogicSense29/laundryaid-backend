import express from 'express'
import cors from 'cors'
import { requestRoute } from './routes/request.js'

const app = express()
const PORT = process.env.PORT 

//middlewares
app.use(
  cors({
    origin: ["https://laundryaid.com.ng", "http://localhost:5174"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());
app.use('/api', requestRoute)


//Nuber of visits
app.post("/api/track-visit", async (req, res) => {
        await db.query("INSERT INTO visits DEFAULT VALUES");
        res.sendStatus(200);
      });
            




app.listen(PORT, ()=> {
        console.log('APP LISTENING ON PORT:', PORT)
})