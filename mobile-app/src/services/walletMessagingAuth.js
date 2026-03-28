import AsyncStorage from "@react-native-async-storage/async-storage";
import { requestWalletChallenge, setMessagingAuthToken, verifyWalletAuth } from "./messagingApi";
import { connectWallet, currentWalletAddress, signWalletMessage } from "./daoChain";

const TOKEN_STORAGE_KEY = "lulit_messaging_wallet_token";
const WALLET_STORAGE_KEY = "lulit_messaging_wallet";

async function persistSession(walletAddress, token) {
  await AsyncStorage.multiSet([
    [TOKEN_STORAGE_KEY, token],
    [WALLET_STORAGE_KEY, walletAddress.toLowerCase()]
  ]);
  setMessagingAuthToken(token);
}

export async function clearMessagingSession() {
  await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, WALLET_STORAGE_KEY]);
  setMessagingAuthToken(null);
}

export async function restoreMessagingSession() {
  const entries = await AsyncStorage.multiGet([TOKEN_STORAGE_KEY, WALLET_STORAGE_KEY]);
  const token = entries.find(([key]) => key === TOKEN_STORAGE_KEY)?.[1] || "";
  const walletAddress = entries.find(([key]) => key === WALLET_STORAGE_KEY)?.[1] || "";
  if (token) {
    setMessagingAuthToken(token);
  }
  return { token, walletAddress };
}

export async function walletLoginForMessaging() {
  try {
    const connectedWallet = (await connectWallet()) || currentWalletAddress();
    if (!connectedWallet) {
      throw new Error("Unable to access wallet address");
    }

    const challenge = await requestWalletChallenge(connectedWallet);
    const signature = await signWalletMessage(challenge.message);
    const session = await verifyWalletAuth(connectedWallet, signature);
    await persistSession(connectedWallet, session.accessToken);
    return session;
  } catch (error) {
    if (error?.response?.status === 401) {
      throw new Error("Session expired. Please login again, then reconnect MetaMask in Messages.");
    }
    throw new Error(error?.response?.data?.message || error?.message || "Unable to authenticate wallet");
  }
}
