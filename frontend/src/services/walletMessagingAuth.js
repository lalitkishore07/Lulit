import { BrowserProvider } from "ethers";
import { requestWalletChallenge, setMessagingAuthToken, verifyWalletAuth } from "./messagingApi";

const TOKEN_STORAGE_KEY = "lulit_messaging_wallet_token";
const WALLET_STORAGE_KEY = "lulit_messaging_wallet";

function persistSession(walletAddress, token) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(WALLET_STORAGE_KEY, walletAddress.toLowerCase());
  setMessagingAuthToken(token);
}

export function clearMessagingSession() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(WALLET_STORAGE_KEY);
  setMessagingAuthToken(null);
}

export function restoreMessagingSession() {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY) || "";
  const walletAddress = localStorage.getItem(WALLET_STORAGE_KEY) || "";
  if (token) {
    setMessagingAuthToken(token);
  }
  return { token, walletAddress };
}

function getWalletError(error, fallback) {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message || "";

  if (status === 401) {
    return "Session expired. Please login again, then reconnect MetaMask in Messages.";
  }
  if (serverMessage) {
    return serverMessage;
  }
  if (error?.code === 4001) {
    return "MetaMask request was rejected.";
  }
  if (error?.code === -32002) {
    return "MetaMask already has a pending request open. Finish that popup first.";
  }
  return error?.message || fallback;
}

export async function getConnectedMessagingWallet() {
  if (!window.ethereum) {
    return "";
  }

  const provider = new BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_accounts", []);
  return accounts?.[0] || "";
}

export async function walletLoginForMessaging() {
  if (!window.ethereum) {
    throw new Error("MetaMask is required for secure messaging");
  }

  try {
    const provider = new BrowserProvider(window.ethereum);
    let accounts = await provider.send("eth_accounts", []);
    if (!accounts?.length) {
      accounts = await provider.send("eth_requestAccounts", []);
    }

    const walletAddress = accounts?.[0];
    if (!walletAddress) {
      throw new Error("Unable to access wallet address");
    }

    const signer = await provider.getSigner();
    const challenge = await requestWalletChallenge(walletAddress);
    const signature = await signer.signMessage(challenge.message);
    const session = await verifyWalletAuth(walletAddress, signature);
    persistSession(walletAddress, session.accessToken);
    return session;
  } catch (error) {
    throw new Error(getWalletError(error, "Unable to authenticate wallet"));
  }
}
