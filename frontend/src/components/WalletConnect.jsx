import { useState } from "react";
import { BrowserProvider } from "ethers";

export default function WalletConnect() {
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  const connectWallet = async () => {
    setError("");
    if (!window.ethereum) {
      setError("MetaMask not found");
      return;
    }
    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAddress(accounts[0] || "");
    } catch {
      setError("Wallet connection failed");
    }
  };

  return (
    <div className="card p-4">
      <button
        type="button"
        onClick={connectWallet}
        className="rounded-xl bg-brand-500 px-4 py-2 font-semibold text-white hover:bg-brand-700"
      >
        Connect Wallet
      </button>
      {address ? <p className="mt-2 text-sm">Connected: {address}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
