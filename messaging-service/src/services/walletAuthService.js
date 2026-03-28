import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { verifyMessage } from "ethers";
import { config } from "../config.js";
import { updateDb } from "../store/jsonStore.js";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function normalizeWallet(walletAddress) {
  return walletAddress.trim().toLowerCase();
}

function createChallengeMessage(walletAddress, nonce) {
  return [
    "Lulit Secure Messaging Login",
    `Wallet: ${walletAddress}`,
    `Nonce: ${nonce}`,
    "Purpose: secure-messaging-auth",
    "Never sign this challenge for an unknown site."
  ].join("\n");
}

export async function issueChallenge(walletAddress) {
  const normalizedWallet = normalizeWallet(walletAddress);
  const nonce = crypto.randomBytes(16).toString("hex");

  await updateDb((db) => {
    db.challenges[normalizedWallet] = {
      nonce,
      issuedAt: Date.now()
    };
    return db;
  });

  return {
    walletAddress: normalizedWallet,
    nonce,
    message: createChallengeMessage(normalizedWallet, nonce),
    expiresInSeconds: CHALLENGE_TTL_MS / 1000
  };
}

export async function verifyWalletChallenge(walletAddress, signature) {
  const normalizedWallet = normalizeWallet(walletAddress);
  const tokenPayload = await updateDb((db) => {
    const challenge = db.challenges[normalizedWallet];
    if (!challenge) {
      throw new Error("No active challenge for wallet");
    }
    if (Date.now() - challenge.issuedAt > CHALLENGE_TTL_MS) {
      delete db.challenges[normalizedWallet];
      throw new Error("Wallet challenge expired");
    }

    const recovered = verifyMessage(createChallengeMessage(normalizedWallet, challenge.nonce), signature).toLowerCase();
    if (recovered !== normalizedWallet) {
      throw new Error("Wallet signature verification failed");
    }

    delete db.challenges[normalizedWallet];
    return {
      db,
      payload: {
        sub: normalizedWallet,
        typ: "wallet-auth"
      }
    };
  });

  const token = jwt.sign(tokenPayload.payload, config.jwtSecret, {
    // Keep wallet auth alive for the full app session window instead of expiring mid-chat.
    expiresIn: "30d"
  });

  return {
    walletAddress: normalizedWallet,
    accessToken: token
  };
}

export function verifyAccessToken(rawToken) {
  const decoded = jwt.verify(rawToken, config.jwtSecret);
  return decoded.sub;
}
