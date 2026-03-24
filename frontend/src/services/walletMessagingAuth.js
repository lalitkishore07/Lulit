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

export async function walletLoginForMessaging() {
  if (!window.ethereum) {
    throw new Error("MetaMask is required for secure messaging");
  }

  const provider = new BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
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
}
