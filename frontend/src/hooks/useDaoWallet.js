import { useCallback, useEffect, useState } from "react";
import {
  connectAndVerifyWallet,
  disconnectDaoWallet,
  fetchWalletGovernanceStats
} from "../services/daoChain";

export function useDaoWallet() {
  const [wallet, setWallet] = useState("");
  const [stats, setStats] = useState(null);
  const [hydrating, setHydrating] = useState(true);

  const refreshStats = useCallback(async (nextWallet) => {
    if (!nextWallet) {
      setStats(null);
      return null;
    }

    try {
      const nextStats = await fetchWalletGovernanceStats(nextWallet);
      setStats(nextStats);
      return nextStats;
    } catch {
      setStats(null);
      return null;
    }
  }, []);

  const connect = useCallback(async () => {
    const nextWallet = await connectAndVerifyWallet();
    setWallet(nextWallet);
    await refreshStats(nextWallet);
    return nextWallet;
  }, [refreshStats]);

  const disconnect = useCallback(() => {
    disconnectDaoWallet();
    setWallet("");
    setStats(null);
  }, []);

  useEffect(() => {
    setHydrating(false);
  }, [refreshStats]);

  return {
    wallet,
    stats,
    hydrating,
    connect,
    disconnect,
    refreshStats
  };
}
