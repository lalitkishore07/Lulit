import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import ScreenShell from "../components/ScreenShell";
import SurfaceCard from "../components/SurfaceCard";
import {
  connectWallet,
  createProposalSigned,
  currentWalletMode,
  verifyWalletSession
} from "../services/daoChain";
import { palette } from "../theme";

export default function DaoCreateProposalScreen({ navigation, route }) {
  const presetWallet = route?.params?.wallet || "";
  const [wallet, setWallet] = useState(presetWallet);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [proposalType, setProposalType] = useState("FEATURE_UPDATE");
  const [votingStrategy, setVotingStrategy] = useState("ONE_WALLET_ONE_VOTE");
  const [startEpoch, setStartEpoch] = useState(String(Math.floor(Date.now() / 1000)));
  const [endEpoch, setEndEpoch] = useState(String(Math.floor(Date.now() / 1000) + 86400));
  const [quorumBps, setQuorumBps] = useState("2000");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState("");

  const connect = async () => {
    try {
      setError("");
      setStatus("");
      const address = await connectWallet();
      await verifyWalletSession(address);
      setWallet(address);
      setMode(currentWalletMode());
      setStatus(`Wallet connected and verified via ${currentWalletMode() === "dev" ? "local dev wallet" : "WalletConnect"}`);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Wallet verification failed");
    }
  };

  const submit = async () => {
    if (!wallet) {
      setError("Connect wallet first");
      return;
    }
    if (title.trim().length < 5 || description.trim().length < 20) {
      setError("Title/description too short");
      return;
    }
    try {
      setLoading(true);
      setError("");
      setStatus("");
      const created = await createProposalSigned({
        title: title.trim(),
        description: description.trim(),
        wallet,
        proposalType,
        votingStrategy,
        startTimeEpochSecond: Number(startEpoch),
        endTimeEpochSecond: Number(endEpoch),
        quorumBps: Number(quorumBps)
      });
      setStatus(`Proposal #${created.id} created`);
      navigation.navigate("DaoDashboard");
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to create proposal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell
      eyebrow="Proposal Builder"
      title="Create DAO proposal"
      subtitle="Shape governance updates with a complete spec, verified signer, and active voting parameters."
      scroll
      bodyStyle={styles.content}
    >
      <SurfaceCard style={styles.card}>
        <Pressable style={styles.connectBtn} onPress={connect}>
          <Text style={styles.connectText}>Connect Wallet</Text>
        </Pressable>
        {wallet ? <Text style={styles.wallet}>Wallet: {wallet}</Text> : null}
        {mode ? <Text style={styles.wallet}>Mode: {mode === "dev" ? "Local Dev Wallet" : "WalletConnect"}</Text> : null}

        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor="#94a3b8" />
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Description"
          placeholderTextColor="#94a3b8"
          multiline
        />
        <TextInput style={styles.input} value={proposalType} onChangeText={setProposalType} placeholder="Proposal Type" placeholderTextColor="#94a3b8" />
        <TextInput style={styles.input} value={votingStrategy} onChangeText={setVotingStrategy} placeholder="Voting Strategy" placeholderTextColor="#94a3b8" />
        <TextInput style={styles.input} value={startEpoch} onChangeText={setStartEpoch} placeholder="Start Epoch" placeholderTextColor="#94a3b8" keyboardType="numeric" />
        <TextInput style={styles.input} value={endEpoch} onChangeText={setEndEpoch} placeholder="End Epoch" placeholderTextColor="#94a3b8" keyboardType="numeric" />
        <TextInput style={styles.input} value={quorumBps} onChangeText={setQuorumBps} placeholder="Quorum BPS" placeholderTextColor="#94a3b8" keyboardType="numeric" />

        <Pressable style={[styles.submitBtn, loading && styles.disabled]} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Proposal</Text>}
        </Pressable>

        {status ? <Text style={styles.status}>{status}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.hint}>
          Accepted values for type: FEATURE_UPDATE, CONTENT_MODERATION, TREASURY_SPENDING, ADMIN_ELECTION.
        </Text>
        <Text style={styles.hint}>
          Accepted values for strategy: ONE_WALLET_ONE_VOTE, TOKEN_WEIGHTED, REPUTATION_BASED, QUADRATIC.
        </Text>
      </SurfaceCard>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 24
  },
  card: {
    gap: 10
  },
  connectBtn: {
    borderRadius: 16,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.cyan
  },
  connectText: {
    color: "#fff",
    fontWeight: "800"
  },
  wallet: {
    color: palette.inkSoft,
    fontSize: 12
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccd8e8",
    borderRadius: 16,
    backgroundColor: "#f7faff",
    color: palette.ink,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  textarea: {
    minHeight: 110,
    textAlignVertical: "top"
  },
  submitBtn: {
    borderRadius: 16,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.navy
  },
  submitText: {
    color: "#fff",
    fontWeight: "800"
  },
  disabled: {
    opacity: 0.7
  },
  status: {
    color: palette.mint,
    fontWeight: "700"
  },
  error: {
    color: palette.coral,
    fontWeight: "700"
  },
  hint: {
    color: palette.slate,
    fontSize: 12
  }
});
