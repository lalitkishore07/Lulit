import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config.js";
import { requireWalletAuth } from "./middleware/auth.js";
import { issueChallenge, verifyWalletChallenge } from "./services/walletAuthService.js";
import { claimOneTimePrekey, getIdentity, registerIdentity } from "./services/identityService.js";
import { fetchEncryptedEnvelope, uploadEncryptedEnvelope } from "./services/web3StorageService.js";
import { getMessageRecord, listInbox, registerMessageRecord } from "./services/messageRegistryService.js";

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS origin not allowed"));
    }
  })
);
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "secure-messaging",
    transport: "cid-only",
    storageProvider: "pinata",
    torProxyEnabled: Boolean(config.torSocksUrl)
  });
});

app.post("/api/v1/auth/challenge", async (req, res) => {
  try {
    const walletAddress = String(req.body.walletAddress || "");
    if (!walletAddress) {
      return res.status(400).json({ message: "walletAddress is required" });
    }
    return res.json(await issueChallenge(walletAddress));
  } catch (error) {
    return res.status(400).json({ message: error.message || "Unable to issue wallet challenge" });
  }
});

app.post("/api/v1/auth/verify", async (req, res) => {
  try {
    const walletAddress = String(req.body.walletAddress || "");
    const signature = String(req.body.signature || "");
    return res.json(await verifyWalletChallenge(walletAddress, signature));
  } catch (error) {
    return res.status(400).json({ message: error.message || "Wallet authentication failed" });
  }
});

app.post("/api/v1/identities/register", requireWalletAuth, async (req, res) => {
  try {
    const identity = req.body;
    if (!identity.encryptionPublicKey || !Array.isArray(identity.oneTimePrekeys)) {
      return res.status(400).json({ message: "encryptionPublicKey and oneTimePrekeys are required" });
    }
    return res.json(await registerIdentity(req.walletAddress, identity));
  } catch (error) {
    return res.status(400).json({ message: error.message || "Unable to register messaging identity" });
  }
});

app.get("/api/v1/identities/:walletAddress", requireWalletAuth, async (req, res) => {
  const identity = await getIdentity(req.params.walletAddress);
  if (!identity) {
    return res.status(404).json({ message: "Messaging identity not found" });
  }
  return res.json(identity);
});

app.post("/api/v1/identities/:walletAddress/prekeys/claim", requireWalletAuth, async (req, res) => {
  try {
    return res.json(await claimOneTimePrekey(req.params.walletAddress));
  } catch (error) {
    return res.status(400).json({ message: error.message || "Unable to claim recipient prekey" });
  }
});

app.post("/api/v1/messages/send", requireWalletAuth, async (req, res) => {
  try {
    const { recipientWallet, envelope, envelopeDigest, prekeyId, securityMode = "STANDARD", signatureBundle = {} } = req.body;

    if (!recipientWallet || !envelope || !envelopeDigest || !prekeyId) {
      return res.status(400).json({ message: "recipientWallet, envelope, envelopeDigest and prekeyId are required" });
    }
    if (!["STANDARD", "PRIVATE"].includes(securityMode)) {
      return res.status(400).json({ message: "securityMode must be STANDARD or PRIVATE" });
    }

    // The service only handles ciphertext envelopes plus minimal routing data;
    // plaintext never reaches the backend or IPFS.
    const cid = await uploadEncryptedEnvelope(envelope);
    const record = await registerMessageRecord({
      senderWallet: req.walletAddress,
      recipientWallet,
      cid,
      envelopeDigest,
      prekeyId,
      securityMode,
      transport: {
        ipfsGateway: config.pinataGatewayUrl
      },
      signatureBundle
    });

    return res.status(201).json(record);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Unable to send encrypted message" });
  }
});

app.get("/api/v1/messages/inbox", requireWalletAuth, async (req, res) => {
  return res.json(await listInbox(req.walletAddress));
});

app.get("/api/v1/messages/:cid", requireWalletAuth, async (req, res) => {
  try {
    const record = await getMessageRecord(req.params.cid);
    if (!record) {
      return res.status(404).json({ message: "Encrypted message metadata not found" });
    }
    if (record.recipientWallet !== req.walletAddress && record.senderWallet !== req.walletAddress) {
      return res.status(403).json({ message: "You cannot access this encrypted message" });
    }
    return res.json({
      record,
      envelope: await fetchEncryptedEnvelope(req.params.cid)
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Unable to retrieve encrypted message" });
  }
});

app.listen(config.port, () => {
  console.log(`Secure messaging service listening on ${config.port}`);
});
