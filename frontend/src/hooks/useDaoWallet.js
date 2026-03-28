import { useCallback, useEffect, useState } from "react";
import {
  connectAndVerifyWallet,
  disconnectDaoWallet,
  fetchWalletGovernanceStats,
  loadPersistedWallet
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
    let active = true;
    const restore = async () => {
      try {
        const hasActiveAppSession = Boolean(window.localStorage.getItem("lulit_user"));
        if (!hasActiveAppSession) {
          if (active) {
            setWallet("");
            setStats(null);
          }
          return;
        }

        const restoredWallet = await loadPersistedWallet();
        if (!active) {
          return;
        }
        setWallet(restoredWallet);
        await refreshStats(restoredWallet);
      } finally {
        if (active) {
          setHydrating(false);
        }
      }
    };

    restore();
    return () => {
      active = false;
    };
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
