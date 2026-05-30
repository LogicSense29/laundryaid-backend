import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config(); 

export const auth = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    return res
      .status(401)
      .json({ error: "Authorization token missing or malformed" });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    req.user_id = decoded.id;
    console.log(decoded);
    console.log(process.env.SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
