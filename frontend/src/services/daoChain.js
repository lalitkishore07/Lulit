import { BrowserProvider } from "ethers";
import api from "./api";
import { getApiBaseUrl } from "./runtimeConfig";

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

async function signDaoMessage(message) {
  const provider = await getProvider();
  const signer = await provider.getSigner();
  return signer.signMessage(message);
}

export async function connectWallet() {
  const provider = await getProvider();
  const accounts = await provider.send("eth_requestAccounts", []);
  return accounts?.[0] || "";
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
