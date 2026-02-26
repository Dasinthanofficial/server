import jwt from "jsonwebtoken";

export function authAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload?.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid/expired token" });
  }
}