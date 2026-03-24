import crypto from "node:crypto";
import { readDb, updateDb } from "../store/jsonStore.js";

function normalizeWallet(walletAddress) {
  return walletAddress.trim().toLowerCase();
}

export async function registerMessageRecord({
  senderWallet,
  recipientWallet,
  cid,
  envelopeDigest,
  prekeyId,
  securityMode,
  transport,
  signatureBundle
}) {
  const record = {
    id: crypto.randomUUID(),
    senderWallet: normalizeWallet(senderWallet),
    recipientWallet: normalizeWallet(recipientWallet),
    cid,
    prekeyId,
    envelopeDigest,
    securityMode: securityMode || "STANDARD",
    transport,
    signatureBundle,
    createdAt: new Date().toISOString()
  };

  await updateDb((db) => {
    db.messages.push(record);
    return db;
  });

  return record;
}

export async function listInbox(walletAddress) {
  const normalizedWallet = normalizeWallet(walletAddress);
  const db = await readDb();
  return db.messages
    .filter((message) => message.recipientWallet === normalizedWallet)
    .map((message) => ({
      ...message,
      senderLabel: message.securityMode === "PRIVATE" ? "Hidden until decrypt" : message.senderWallet,
      createdAt: message.securityMode === "PRIVATE" ? null : message.createdAt
    }));
}

export async function getMessageRecord(cid) {
  const db = await readDb();
  return db.messages.find((message) => message.cid === cid) || null;
}
