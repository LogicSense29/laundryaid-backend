import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    return res.status(401).json({ error: "Authorization token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

export const superAdminAuth = (req, res, next) => {
  adminAuth(req, res, () => {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ error: "Access denied. Superadmin only." });
    }
    next();
  });
};
