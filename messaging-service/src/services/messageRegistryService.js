import crypto from "node:crypto";
import { readDb, updateDb } from "../store/jsonStore.js";

function normalizeWallet(walletAddress) {
  return walletAddress.trim().toLowerCase();
}

function isParticipant(message, walletAddress) {
  return message.recipientWallet === walletAddress || message.senderWallet === walletAddress;
}

function counterpartyWallet(message, walletAddress) {
  return message.senderWallet === walletAddress ? message.recipientWallet : message.senderWallet;
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

export async function listConversations(walletAddress) {
  const normalizedWallet = normalizeWallet(walletAddress);
  const db = await readDb();
  const latestByCounterparty = new Map();

  db.messages
    .filter((message) => isParticipant(message, normalizedWallet))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((message) => {
      const otherWallet = counterpartyWallet(message, normalizedWallet);
      if (latestByCounterparty.has(otherWallet)) {
        return;
      }
      latestByCounterparty.set(otherWallet, {
        id: otherWallet,
        counterpartyWallet: otherWallet,
        lastMessageAt: message.createdAt,
        lastDirection: message.senderWallet === normalizedWallet ? "OUTGOING" : "INCOMING",
        securityMode: message.securityMode,
        previewLabel: message.securityMode === "PRIVATE" ? "Private encrypted message" : "Encrypted message",
        messageCount: db.messages.filter((item) => isParticipant(item, normalizedWallet) && counterpartyWallet(item, normalizedWallet) === otherWallet).length
      });
    });

  return [...latestByCounterparty.values()];
}

export async function listThread(walletAddress, otherWalletAddress) {
  const normalizedWallet = normalizeWallet(walletAddress);
  const normalizedOtherWallet = normalizeWallet(otherWalletAddress);
  const db = await readDb();

  return db.messages
    .filter((message) => isParticipant(message, normalizedWallet) && counterpartyWallet(message, normalizedWallet) === normalizedOtherWallet)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((message) => ({
      ...message,
      direction: message.senderWallet === normalizedWallet ? "OUTGOING" : "INCOMING",
      senderLabel: message.securityMode === "PRIVATE" && message.senderWallet !== normalizedWallet ? "Hidden until decrypt" : message.senderWallet,
      createdAt: message.securityMode === "PRIVATE" ? message.createdAt : message.createdAt
    }));
}

export async function getMessageRecord(cid) {
  const db = await readDb();
  return db.messages.find((message) => message.cid === cid) || null;
}
