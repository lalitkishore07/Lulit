import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 8090),
  jwtSecret: process.env.MESSAGING_JWT_SECRET || "replace-me-before-production",
  corsOrigins: (process.env.MESSAGING_CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  pinataJwt: process.env.PINATA_JWT || "",
  pinataGatewayUrl: process.env.PINATA_GATEWAY_URL || "https://gateway.pinata.cloud/ipfs",
  messageStoreFile: process.env.MESSAGE_STORE_FILE || "./data/messages-db.json",
  torSocksUrl: process.env.TOR_SOCKS_URL || ""
};
