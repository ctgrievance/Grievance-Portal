import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    const secretKey = process.env.JWT_SECRET || "fallback_secret_key_123";
    const decoded = jwt.verify(token, secretKey);

    req.user = decoded; // { id, role, email, etc }
    next();
  } catch (error) {
    console.log("JWT Error:", error.message);
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};
