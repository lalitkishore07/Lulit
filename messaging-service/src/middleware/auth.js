import { verifyAccessToken } from "../services/walletAuthService.js";

export function requireWalletAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return res.status(401).json({ message: "Missing wallet auth token" });
    }
    req.walletAddress = verifyAccessToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ message: error.message || "Invalid wallet auth token" });
  }
}
