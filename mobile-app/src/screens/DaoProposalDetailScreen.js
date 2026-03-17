import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import ScreenShell from "../components/ScreenShell";
import SurfaceCard from "../components/SurfaceCard";
import api from "../services/api";
import {
  castVoteSigned,
  connectWallet,
  currentWalletMode,
  fetchWalletGovernanceStats,
  verifyWalletSession
} from "../services/daoChain";
import { palette } from "../theme";

export default function DaoProposalDetailScreen({ route }) {
  const { id } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [proposal, setProposal] = useState(null);
  const [results, setResults] = useState(null);
  const [wallet, setWallet] = useState("");
  const [walletStats, setWalletStats] = useState(null);
  const [mode, setMode] = useState("");

  const load = async () => {
    try {
      const [{ data: p }, { data: r }] = await Promise.all([
        api.get(`/dao/proposals/${id}`),
        api.get(`/dao/proposals/${id}/results`)
      ]);
      setProposal(p);
      setResults(r);
      setError("");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load proposal");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 12000);
    return () => clearInterval(timer);
  }, [id]);

  const connect = async () => {
    try {
      setError("");
      const address = await connectWallet();
      await verifyWalletSession(address);
      setWallet(address);
      setWalletStats(await fetchWalletGovernanceStats(address));
      setMode(currentWalletMode());
      setStatus(`Wallet verified via ${currentWalletMode() === "dev" ? "local dev wallet" : "WalletConnect"}`);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Wallet connection failed");
    }
  };

  const vote = async (choice) => {
    try {
      setError("");
      setStatus("");
      if (!wallet) throw new Error("Connect wallet first");
      await castVoteSigned(Number(id), wallet, choice);
      setStatus("Vote submitted successfully");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Vote failed");
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#1238a0" />
      </View>
    );
  }

  return (
    <ScreenShell
      eyebrow="Proposal Detail"
      title={`DAO proposal #${id}`}
      subtitle="Inspect the proposal, review quorum, verify the signer, and cast your decision."
      scroll
      bodyStyle={styles.content}
      action={(
        <Pressable style={styles.connectBtn} onPress={connect}>
          <Text style={styles.connectText}>Connect Wallet</Text>
        </Pressable>
      )}
    >
      {wallet ? <Text style={styles.wallet}>Wallet: {wallet}</Text> : null}
      {mode ? <Text style={styles.wallet}>Mode: {mode === "dev" ? "Local Dev Wallet" : "WalletConnect"}</Text> : null}
      {walletStats ? <Text style={styles.wallet}>Voting power: {Number(walletStats.votingPower || 0).toFixed(2)}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {proposal ? (
        <SurfaceCard style={styles.card}>
          <Text style={styles.label}>Title</Text>
          <Text style={styles.value}>{proposal.title}</Text>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.value}>{proposal.description}</Text>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{proposal.state}</Text>
          <Text style={styles.label}>Votes</Text>
          <Text style={styles.value}>For {proposal.forVotes} | Against {proposal.againstVotes} | Abstain {proposal.abstainVotes}</Text>
          {results ? (
            <>
              <Text style={styles.label}>Quorum</Text>
              <Text style={styles.value}>Required {results.quorumRequired} | Cast {results.totalVotes}</Text>
            </>
          ) : null}
        </SurfaceCard>
      ) : null}

      <View style={styles.voteRow}>
        <Pressable style={[styles.voteBtn, styles.voteFor]} onPress={() => vote("FOR")}>
          <Text style={styles.voteText}>Vote For</Text>
        </Pressable>
        <Pressable style={[styles.voteBtn, styles.voteAgainst]} onPress={() => vote("AGAINST")}>
          <Text style={styles.voteText}>Vote Against</Text>
        </Pressable>
        <Pressable style={[styles.voteBtn, styles.voteAbstain]} onPress={() => vote("ABSTAIN")}>
          <Text style={styles.voteText}>Abstain</Text>
        </Pressable>
      </View>

      {status ? <Text style={styles.status}>{status}</Text> : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 24
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.canvas
  },
  connectBtn: {
    borderRadius: 14,
    backgroundColor: palette.cyan,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  connectText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12
  },
  wallet: {
    color: palette.inkSoft,
    fontSize: 12
  },
  card: {
    gap: 2
  },
  label: {
    marginTop: 8,
    color: palette.slate,
    fontSize: 12,
    textTransform: "uppercase"
  },
  value: {
    marginTop: 3,
    color: palette.ink
  },
  voteRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8
  },
  voteBtn: {
    flex: 1,
    borderRadius: 14,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center"
  },
  voteFor: {
    backgroundColor: "#16a34a"
  },
  voteAgainst: {
    backgroundColor: "#dc2626"
  },
  voteAbstain: {
    backgroundColor: "#475569"
  },
  voteText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12
  },
  error: {
    color: palette.coral
  },
  status: {
    color: palette.mint,
    marginTop: 8
  }
});
