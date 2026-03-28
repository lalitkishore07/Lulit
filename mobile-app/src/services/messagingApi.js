import axios from "axios";

const baseURL = (process.env.EXPO_PUBLIC_MESSAGING_API_BASE_URL || "https://lulit-production.up.railway.app/api/v1").replace(/\/+$/, "");

const messagingApi = axios.create({
  baseURL,
  timeout: 15000
});

messagingApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      error.response.data = {
        ...(error.response.data || {}),
        message: "Session expired. Please login again, then reconnect MetaMask in Messages."
      };
      delete messagingApi.defaults.headers.common.Authorization;
    }
    return Promise.reject(error);
  }
);

export function setMessagingAuthToken(token) {
  if (token) {
    messagingApi.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }
  delete messagingApi.defaults.headers.common.Authorization;
}

export async function requestWalletChallenge(walletAddress) {
  const { data } = await messagingApi.post("/auth/challenge", { walletAddress });
  return data;
}

export async function verifyWalletAuth(walletAddress, signature) {
  const { data } = await messagingApi.post("/auth/verify", { walletAddress, signature });
  return data;
}

export async function registerMessagingIdentity(identity) {
  const { data } = await messagingApi.post("/identities/register", identity);
  return data;
}

export async function getMessagingIdentity(walletAddress) {
  const { data } = await messagingApi.get(`/identities/${walletAddress}`);
  return data;
}

export async function lookupMessagingIdentityByUsername(username) {
  const { data } = await messagingApi.get(`/identities/lookup/${encodeURIComponent(String(username || "").replace(/^@/, ""))}`);
  return data;
}

export async function claimRecipientPrekey(walletAddress) {
  const { data } = await messagingApi.post(`/identities/${walletAddress}/prekeys/claim`);
  return data;
}

export async function sendEncryptedMessage(payload) {
  const { data } = await messagingApi.post("/messages/send", payload);
  return data;
}

export async function fetchConversations() {
  const { data } = await messagingApi.get("/messages/conversations");
  return data;
}

export async function fetchThread(walletAddress) {
  const { data } = await messagingApi.get(`/messages/thread/${walletAddress}`);
  return data;
}

export async function fetchEncryptedMessage(cid) {
  const { data } = await messagingApi.get(`/messages/${cid}`);
  return data;
}

export default messagingApi;
