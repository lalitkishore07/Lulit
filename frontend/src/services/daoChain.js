import { BrowserProvider } from "ethers";
import api from "./api";
import { getApiBaseUrl } from "./runtimeConfig";

const DAO_WALLET_STORAGE_KEY = "lulit_dao_wallet";

export const DAO_PROPOSAL_TYPE = {
  FEATURE_UPDATE: "FEATURE_UPDATE",
  CONTENT_MODERATION: "CONTENT_MODERATION",
  TREASURY_SPENDING: "TREASURY_SPENDING",
  ADMIN_ELECTION: "ADMIN_ELECTION"
};

export const DAO_VOTING_STRATEGY = {
  ONE_WALLET_ONE_VOTE: "ONE_WALLET_ONE_VOTE",
  TOKEN_WEIGHTED: "TOKEN_WEIGHTED",
  REPUTATION_BASED: "REPUTATION_BASED",
  QUADRATIC: "QUADRATIC"
};

function ensureWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask is required");
  }
}

async function getProvider() {
  ensureWallet();
  return new BrowserProvider(window.ethereum);
}

function persistWallet(wallet) {
  if (typeof window === "undefined") {
    return;
  }
  if (wallet) {
    window.localStorage.setItem(DAO_WALLET_STORAGE_KEY, wallet);
    return;
  }
  window.localStorage.removeItem(DAO_WALLET_STORAGE_KEY);
}

export function clearPersistedDaoWallet() {
  persistWallet("");
}

export function getStoredDaoWallet() {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(DAO_WALLET_STORAGE_KEY) || "";
}

async function signDaoMessage(message) {
  const provider = await getProvider();
  const signer = await provider.getSigner();
  return signer.signMessage(message);
}

export async function connectWallet() {
  const provider = await getProvider();
  const accounts = await provider.send("eth_requestAccounts", []);
  const wallet = accounts?.[0] || "";
  persistWallet(wallet);
  return wallet;
}

export async function verifyWalletSession(wallet) {
  const challenge = await api.post("/dao/signature/challenge", {
    wallet,
    purpose: "AUTH"
  });
  const signature = await signDaoMessage(challenge.data.message);
  const { data } = await api.post("/dao/auth/verify", {
    wallet,
    nonce: challenge.data.nonce,
    signature
  });
  return data;
}

export async function connectAndVerifyWallet() {
  const wallet = await connectWallet();
  await verifyWalletSession(wallet);
  persistWallet(wallet);
  return wallet;
}

export function disconnectDaoWallet() {
  clearPersistedDaoWallet();
}

export async function loadPersistedWallet() {
  const storedWallet = getStoredDaoWallet();

  if (!storedWallet || !window.ethereum) {
    return storedWallet;
  }

  const provider = await getProvider();
  const accounts = await provider.send("eth_accounts", []);
  const matchedWallet = accounts.find((account) => account.toLowerCase() === storedWallet.toLowerCase()) || "";

  persistWallet(matchedWallet);
  return matchedWallet;
}

export async function fetchWalletGovernanceStats(wallet) {
  const { data } = await api.get(`/dao/eligibility/${wallet}`);
  return data;
}

export async function createProposalSigned(payload) {
  const challenge = await api.post("/dao/signature/challenge", {
    wallet: payload.wallet,
    purpose: "CREATE_PROPOSAL"
  });
  const signature = await signDaoMessage(challenge.data.message);
  const { data } = await api.post("/dao/proposals", {
    ...payload,
    nonce: challenge.data.nonce,
    signature
  });
  return data;
}

export async function castVoteSigned(proposalId, wallet, choice) {
  const challenge = await api.post("/dao/signature/challenge", {
    wallet,
    purpose: "CAST_VOTE",
    proposalId,
    choice
  });
  const signature = await signDaoMessage(challenge.data.message);
  const { data } = await api.post(`/dao/proposals/${proposalId}/vote`, {
    wallet,
    choice,
    nonce: challenge.data.nonce,
    signature
  });
  return data;
}

export function subscribeToDaoEvents(onEvent, accessToken) {
  const apiBase = getApiBaseUrl();
  const wsBase = apiBase.replace("http://", "ws://").replace("https://", "wss://").replace(/\/api\/v1$/, "");
  const tokenParam = accessToken ? `?token=${encodeURIComponent(accessToken)}` : "";
  const socket = new WebSocket(`${wsBase}/ws/dao${tokenParam}`);
  socket.onmessage = () => onEvent();
  return () => {
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
  };
}
