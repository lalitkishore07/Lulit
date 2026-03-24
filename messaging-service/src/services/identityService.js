import { readDb, updateDb } from "../store/jsonStore.js";

function normalizeWallet(walletAddress) {
  return walletAddress.trim().toLowerCase();
}

export async function registerIdentity(walletAddress, identity) {
  const normalizedWallet = normalizeWallet(walletAddress);
  await updateDb((db) => {
    db.identities[normalizedWallet] = {
      walletAddress: normalizedWallet,
      encryptionPublicKey: identity.encryptionPublicKey,
      signingPublicKey: identity.signingPublicKey || "",
      oneTimePrekeys: identity.oneTimePrekeys || [],
      updatedAt: new Date().toISOString()
    };
    return db;
  });

  return getIdentity(normalizedWallet);
}

export async function getIdentity(walletAddress) {
  const normalizedWallet = normalizeWallet(walletAddress);
  const db = await readDb();
  return db.identities[normalizedWallet] || null;
}

export async function claimOneTimePrekey(walletAddress) {
  const normalizedWallet = normalizeWallet(walletAddress);
  let reservedPrekey = null;

  await updateDb((db) => {
    const identity = db.identities[normalizedWallet];
    if (!identity || !identity.oneTimePrekeys?.length) {
      throw new Error("Recipient has no messaging prekeys registered");
    }
    reservedPrekey = identity.oneTimePrekeys.shift();
    identity.updatedAt = new Date().toISOString();
    return db;
  });

  return reservedPrekey;
}
