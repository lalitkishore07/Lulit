import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import ScreenShell from "../components/ScreenShell";
import SurfaceCard from "../components/SurfaceCard";
import { useAuth } from "../context/AuthContext";
import { openMessages } from "../services/webLinks";
import { palette, radius } from "../theme";

function SecurityPill({ title, subtitle, accent }) {
  return (
    <View style={[styles.pill, { borderColor: accent, backgroundColor: `${accent}14` }]}>
      <Text style={[styles.pillTitle, { color: accent }]}>{title}</Text>
      <Text style={styles.pillSubtitle}>{subtitle}</Text>
    </View>
  );
}

export default function MessagesScreen() {
  const { user } = useAuth();
  const [recipient, setRecipient] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const normalizedRecipient = recipient.trim().replace(/^@/, "");

  const launchMessages = async (username) => {
    setError("");
    setStatus("");
    try {
      await openMessages(username);
      setStatus(username ? `Opening secure chat with @${username.replace(/^@/, "")}` : "Opening secure messages");
    } catch (nextError) {
      setError(nextError?.message || "Unable to open secure messages");
    }
  };

  return (
    <ScreenShell
      eyebrow="Private Space"
      title="Messages"
      subtitle="Open the secure DM experience from mobile with username-style chats, private mode, and wallet-backed encryption."
      scroll
      bodyStyle={styles.content}
    >
      <View style={styles.heroPanel}>
        <Text style={styles.kicker}>Secure DMs</Text>
        <Text style={styles.headline}>Mobile now follows the web messaging direction.</Text>
        <Text style={styles.subhead}>
          Start with a username, keep the DM-style flow, and hand off into the live encrypted experience for the deepest security.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={() => launchMessages()}>
          <Text style={styles.primaryBtnText}>Open All Messages</Text>
        </Pressable>
      </View>

      <SurfaceCard style={styles.composeCard}>
        <Text style={styles.sectionTitle}>New chat</Text>
        <Text style={styles.sectionSubtitle}>Type a username the way you would in social DMs.</Text>
        <TextInput
          autoCapitalize="none"
          onChangeText={setRecipient}
          placeholder="@username"
          placeholderTextColor={palette.slate}
          style={styles.input}
          value={recipient}
        />
        <Pressable
          style={[styles.secondaryBtn, !normalizedRecipient && styles.secondaryBtnDisabled]}
          onPress={() => launchMessages(recipient)}
          disabled={!normalizedRecipient}
        >
          <Text style={styles.secondaryBtnText}>Chat with @{normalizedRecipient || "username"}</Text>
        </Pressable>
      </SurfaceCard>

      <SurfaceCard style={styles.threadPreview}>
        <View style={styles.threadHeader}>
          <View>
            <Text style={styles.threadHandle}>@{normalizedRecipient || "username"}</Text>
            <Text style={styles.threadMeta}>Secure conversation preview</Text>
          </View>
          <View style={styles.modeWrap}>
            <Text style={styles.modeChip}>Private</Text>
          </View>
        </View>

        <View style={styles.bubbleWrapLeft}>
          <View style={styles.incomingBubble}>
            <Text style={styles.bubbleLabel}>@{normalizedRecipient || "username"}</Text>
            <Text style={styles.bubbleText}>Hey, can we discuss this privately?</Text>
          </View>
        </View>
        <View style={styles.bubbleWrapRight}>
          <View style={styles.outgoingBubble}>
            <Text style={styles.bubbleLabel}>You</Text>
            <Text style={styles.bubbleText}>Yes, opening a secure DM now.</Text>
          </View>
        </View>
      </SurfaceCard>

      <View style={styles.securityGrid}>
        <SecurityPill accent={palette.cyan} title="Standard Secure" subtitle="Everyday encrypted chat with faster flow." />
        <SecurityPill accent={palette.mint} title="Private Mode" subtitle="Use it for more sensitive messages or media." />
      </View>

      <SurfaceCard style={styles.accountCard}>
        <Text style={styles.sectionTitle}>Signed in</Text>
        <Text style={styles.accountHandle}>@{user?.username || "lulit"}</Text>
        <Text style={styles.sectionSubtitle}>Your mobile app now points at the live cloud stack and opens the secure web DM flow with the same product identity.</Text>
        <Pressable style={styles.linkBtn} onPress={() => Linking.openURL("https://frontend-peach-eight-mhrkt5iw5h.vercel.app")}>
          <Text style={styles.linkBtnText}>Open Live Web App</Text>
        </Pressable>
      </SurfaceCard>

      {status ? <Text style={styles.status}>{status}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 30
  },
  heroPanel: {
    backgroundColor: "#0f172a",
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 10
  },
  kicker: {
    color: "#7dd3fc",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  headline: {
    color: "#ffffff",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900"
  },
  subhead: {
    color: "#cbd5e1",
    lineHeight: 21
  },
  primaryBtn: {
    marginTop: 6,
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22d3ee"
  },
  primaryBtnText: {
    color: "#082f49",
    fontWeight: "900"
  },
  composeCard: {
    gap: 10
  },
  threadPreview: {
    gap: 12,
    backgroundColor: "rgba(15,23,42,0.96)"
  },
  threadHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  threadHandle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900"
  },
  threadMeta: {
    color: "#94a3b8",
    marginTop: 2
  },
  modeWrap: {
    alignItems: "flex-end"
  },
  modeChip: {
    color: "#bbf7d0",
    backgroundColor: "rgba(16,185,129,0.16)",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: "800"
  },
  bubbleWrapLeft: {
    alignItems: "flex-start"
  },
  bubbleWrapRight: {
    alignItems: "flex-end"
  },
  incomingBubble: {
    maxWidth: "82%",
    borderRadius: 22,
    borderTopLeftRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.09)"
  },
  outgoingBubble: {
    maxWidth: "82%",
    borderRadius: 22,
    borderTopRightRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(34,211,238,0.18)"
  },
  bubbleLabel: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7
  },
  bubbleText: {
    color: "#f8fafc",
    marginTop: 6,
    lineHeight: 20
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  sectionSubtitle: {
    color: palette.inkSoft,
    lineHeight: 20
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#f7fbff",
    paddingHorizontal: 14,
    color: palette.ink,
    fontWeight: "700"
  },
  secondaryBtn: {
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.navy
  },
  secondaryBtnDisabled: {
    opacity: 0.45
  },
  secondaryBtnText: {
    color: "#ffffff",
    fontWeight: "900"
  },
  securityGrid: {
    gap: 10
  },
  pill: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14
  },
  pillTitle: {
    fontWeight: "900"
  },
  pillSubtitle: {
    marginTop: 4,
    color: palette.inkSoft,
    lineHeight: 20
  },
  accountCard: {
    gap: 8
  },
  accountHandle: {
    color: palette.ink,
    fontWeight: "900",
    fontSize: 20
  },
  linkBtn: {
    marginTop: 4,
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#f8fbff"
  },
  linkBtnText: {
    color: palette.ink,
    fontWeight: "800"
  },
  status: {
    color: palette.mint,
    fontWeight: "700"
  },
  error: {
    color: palette.coral,
    fontWeight: "700"
  }
});
