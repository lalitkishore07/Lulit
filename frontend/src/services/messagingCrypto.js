import sodium from "libsodium-wrappers-sumo";
import kyberBuilder from "@dashlane/pqc-kem-kyber768-browser";
import dilithiumBuilder from "@dashlane/pqc-sign-dilithium5-browser";

const STORAGE_KEY = "lulit_secure_messaging_identity_v1";
const PREKEY_POOL_SIZE = 6;
export const MESSAGING_SECURITY_MODE = {
  STANDARD: "STANDARD",
  PRIVATE: "PRIVATE"
};

let kyber;
let dilithium;

function encode(bytes) {
  return sodium.to_base64(bytes, sodium.base64_variants.ORIGINAL);
}

function decode(value) {
  return sodium.from_base64(value, sodium.base64_variants.ORIGINAL);
}

function concatBytes(...items) {
  const totalLength = items.reduce((sum, item) => sum + item.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const item of items) {
    result.set(item, offset);
    offset += item.length;
  }
  return result;
}

function envelopeAad(header) {
  return sodium.from_string(JSON.stringify(header));
}

async function ensurePqSuites() {
  await sodium.ready;
  if (!kyber) {
    kyber = await kyberBuilder();
  }
  if (!dilithium) {
    dilithium = await dilithiumBuilder();
  }
}

function loadRawIdentity() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

function saveRawIdentity(identity) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
}

function createOneTimePrekeyBundle() {
  const boxKeypair = sodium.crypto_box_keypair();
  return {
    id: crypto.randomUUID(),
    boxPublicKey: encode(boxKeypair.publicKey),
    boxPrivateKey: encode(boxKeypair.privateKey)
  };
}

export async function ensureLocalMessagingIdentity() {
  await ensurePqSuites();
  const existing = loadRawIdentity();
  if (existing) {
    return existing;
  }

  const identityKeypair = sodium.crypto_box_keypair();
  const signingKeypair = await dilithium.keypair();
  const oneTimePrekeys = [];

  for (let i = 0; i < PREKEY_POOL_SIZE; i += 1) {
    const classicalPrekey = createOneTimePrekeyBundle();
    const kyberKeypair = await kyber.keypair();
    oneTimePrekeys.push({
      id: classicalPrekey.id,
      boxPublicKey: classicalPrekey.boxPublicKey,
      boxPrivateKey: classicalPrekey.boxPrivateKey,
      kyberPublicKey: encode(kyberKeypair.publicKey),
      kyberPrivateKey: encode(kyberKeypair.privateKey)
    });
  }

  const identity = {
    encryptionPublicKey: encode(identityKeypair.publicKey),
    encryptionPrivateKey: encode(identityKeypair.privateKey),
    signingPublicKey: encode(signingKeypair.publicKey),
    signingPrivateKey: encode(signingKeypair.privateKey),
    oneTimePrekeys
  };

  saveRawIdentity(identity);
  return identity;
}

export async function buildIdentityRegistrationPayload() {
  const identity = await ensureLocalMessagingIdentity();
  return {
    encryptionPublicKey: identity.encryptionPublicKey,
    signingPublicKey: identity.signingPublicKey,
    oneTimePrekeys: identity.oneTimePrekeys.map((item) => ({
      id: item.id,
      boxPublicKey: item.boxPublicKey,
      kyberPublicKey: item.kyberPublicKey
    }))
  };
}

export async function createEncryptedEnvelope({ plaintext, senderWallet, recipientWallet, recipientPrekey, securityMode = MESSAGING_SECURITY_MODE.STANDARD }) {
  await ensurePqSuites();
  const senderEphemeral = sodium.crypto_box_keypair();
  const pqResult = await kyber.encapsulate(decode(recipientPrekey.kyberPublicKey));
  const classicalShared = sodium.crypto_scalarmult(senderEphemeral.privateKey, decode(recipientPrekey.boxPublicKey));
  const hybridSalt = sodium.randombytes_buf(32);
  // Hybrid wrapping combines ephemeral classical ECDH and Kyber so the
  // content-encryption key can only be recovered on the recipient device.
  const wrappingKey = sodium.crypto_generichash(32, concatBytes(classicalShared, pqResult.sharedSecret, hybridSalt));

  const messageKey = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES);
  const contentNonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const wrappingNonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);

  const header = {
    version: 1,
    algorithm: "x25519-ephemeral+kyber768+xchacha20poly1305",
    securityMode,
    senderWallet: senderWallet.toLowerCase(),
    recipientWallet: recipientWallet.toLowerCase(),
    recipientPrekeyId: recipientPrekey.id,
    senderEphemeralPublicKey: encode(senderEphemeral.publicKey),
    pqCiphertext: encode(pqResult.ciphertext),
    hybridSalt: encode(hybridSalt),
    privacyFlags: {
      hideSenderPreview: securityMode === MESSAGING_SECURITY_MODE.PRIVATE,
      shortLivedPlaintext: securityMode === MESSAGING_SECURITY_MODE.PRIVATE,
      requireFreshWalletAuth: securityMode === MESSAGING_SECURITY_MODE.PRIVATE
    }
  };

  const aad = envelopeAad(header);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    sodium.from_string(plaintext),
    aad,
    null,
    contentNonce,
    messageKey
  );

  const wrappedMessageKey = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    messageKey,
    aad,
    null,
    wrappingNonce,
    wrappingKey
  );

  const signingKey = decode((await ensureLocalMessagingIdentity()).signingPrivateKey);
  const digest = sodium.crypto_generichash(32, concatBytes(aad, ciphertext));
  const pqSignature = await dilithium.sign(digest, signingKey);

  return {
    envelope: {
      ...header,
      contentNonce: encode(contentNonce),
      wrappingNonce: encode(wrappingNonce),
      wrappedMessageKey: encode(wrappedMessageKey),
      ciphertext: encode(ciphertext),
      pqSignature: encode(pqSignature.signature)
    },
    envelopeDigest: encode(digest)
  };
}

export async function decryptEnvelope(envelope) {
  await ensurePqSuites();
  const identity = await ensureLocalMessagingIdentity();
  const prekeyIndex = identity.oneTimePrekeys.findIndex((item) => item.id === envelope.recipientPrekeyId);
  if (prekeyIndex < 0) {
    throw new Error("No matching one-time prekey found on this device");
  }

  const prekey = identity.oneTimePrekeys[prekeyIndex];
  // One-time prekeys are consumed after decryption to reduce how much a future
  // device compromise can reveal about past messages.
  const classicalShared = sodium.crypto_scalarmult(decode(prekey.boxPrivateKey), decode(envelope.senderEphemeralPublicKey));
  const pqShared = await kyber.decapsulate(decode(envelope.pqCiphertext), decode(prekey.kyberPrivateKey));
  const wrappingKey = sodium.crypto_generichash(32, concatBytes(classicalShared, pqShared.sharedSecret, decode(envelope.hybridSalt)));

  const header = {
    version: envelope.version,
    algorithm: envelope.algorithm,
    securityMode: envelope.securityMode || MESSAGING_SECURITY_MODE.STANDARD,
    senderWallet: envelope.senderWallet,
    recipientWallet: envelope.recipientWallet,
    recipientPrekeyId: envelope.recipientPrekeyId,
    senderEphemeralPublicKey: envelope.senderEphemeralPublicKey,
    pqCiphertext: envelope.pqCiphertext,
    hybridSalt: envelope.hybridSalt
  };
  const aad = envelopeAad(header);

  const messageKey = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    decode(envelope.wrappedMessageKey),
    aad,
    decode(envelope.wrappingNonce),
    wrappingKey
  );

  const plaintextBytes = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    decode(envelope.ciphertext),
    aad,
    decode(envelope.contentNonce),
    messageKey
  );

  identity.oneTimePrekeys.splice(prekeyIndex, 1);
  while (identity.oneTimePrekeys.length < PREKEY_POOL_SIZE) {
    const replacement = createOneTimePrekeyBundle();
    const kyberKeypair = await kyber.keypair();
    identity.oneTimePrekeys.push({
      id: replacement.id,
      boxPublicKey: replacement.boxPublicKey,
      boxPrivateKey: replacement.boxPrivateKey,
      kyberPublicKey: encode(kyberKeypair.publicKey),
      kyberPrivateKey: encode(kyberKeypair.privateKey)
    });
  }
  saveRawIdentity(identity);

  return sodium.to_string(plaintextBytes);
}
