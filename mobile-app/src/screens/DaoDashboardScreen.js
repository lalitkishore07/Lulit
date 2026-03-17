import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import ScreenShell from "../components/ScreenShell";
import SurfaceCard from "../components/SurfaceCard";
import api from "../services/api";
import {
  connectWallet,
  currentWalletMode,
  fetchWalletGovernanceStats,
  verifyWalletSession
} from "../services/daoChain";
import { palette } from "../theme";

function ProposalCard({ item, onOpen }) {
  return (
    <Pressable onPress={() => onOpen(item.id)}>
      <SurfaceCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>#{item.id} {item.title}</Text>
          <Text style={styles.state}>{item.state}</Text>
        </View>
        <Text style={styles.cardDescription}>{item.description}</Text>
        <Text style={styles.meta}>For {item.forVotes} | Against {item.againstVotes} | Abstain {item.abstainVotes}</Text>
      </SurfaceCard>
    </Pressable>
  );
}

export default function DaoDashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [proposals, setProposals] = useState([]);
  const [wallet, setWallet] = useState("");
  const [stats, setStats] = useState(null);
  const [mode, setMode] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/dao/proposals/active");
      setProposals(data || []);
      setError("");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load DAO proposals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, []);

  const connect = async () => {
    try {
      setError("");
      const address = await connectWallet();
      await verifyWalletSession(address);
      setWallet(address);
      setStats(await fetchWalletGovernanceStats(address));
      setMode(currentWalletMode());
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Wallet authentication failed");
    }
  };

  return (
    <ScreenShell
      eyebrow="Governance"
      title="DAO command deck"
      subtitle="Track active proposals, verify the current signer, and move straight into creation or voting."
      action={(
        <View style={styles.rowBtns}>
          <Pressable style={[styles.btn, styles.btnSecondary]} onPress={connect}>
            <Text style={styles.btnText}>Connect Wallet</Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={() => navigation.navigate("DaoCreateProposal")}>
            <Text style={styles.btnText}>Create</Text>
          </Pressable>
        </View>
      )}
    >
      {wallet ? <Text style={styles.wallet}>Wallet: {wallet}</Text> : null}
      {mode ? <Text style={styles.wallet}>Mode: {mode === "dev" ? "Local Dev Wallet" : "WalletConnect"}</Text> : null}
      {stats ? (
        <Text style={styles.stats}>
          Voting power: {Number(stats.votingPower || 0).toFixed(2)} | Reputation: {Number(stats.reputationScore || 0).toFixed(2)}
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator size="large" color="#1238a0" />
      ) : (
        <FlatList
          data={proposals}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ProposalCard item={item} onOpen={(id) => navigation.navigate("DaoProposalDetail", { id })} />}
          ListEmptyComponent={<Text style={styles.empty}>No active proposals.</Text>}
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  rowBtns: {
    flexDirection: "row",
    gap: 8
  },
  btn: {
    borderRadius: 14,
    backgroundColor: palette.cyan,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  btnSecondary: {
    backgroundColor: palette.navy
  },
  btnText: {
    color: "#fff",
    fontWeight: "800"
  },
  card: {
    marginBottom: 12
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10
  },
  cardTitle: {
    flex: 1,
    color: palette.ink,
    fontWeight: "800"
  },
  state: {
    color: palette.mint,
    fontWeight: "800"
  },
  cardDescription: {
    marginTop: 6,
    color: palette.inkSoft
  },
  meta: {
    marginTop: 6,
    color: palette.slate,
    fontSize: 12
  },
  error: {
    color: palette.coral,
    marginBottom: 10
  },
  wallet: {
    color: palette.ink,
    fontSize: 12,
    marginBottom: 4
  },
  stats: {
    color: palette.slate,
    fontSize: 12,
    marginBottom: 8
  },
  empty: {
    color: palette.slate,
    marginTop: 12
  }
});
