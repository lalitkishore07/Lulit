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
      <SurfaceCard style={styles.hero}>
        <Text style={styles.kicker}>Secure Messaging</Text>
        <Text style={styles.headline}>DM people by username, not by wallet address.</Text>
        <Text style={styles.subhead}>
          The full encrypted messaging flow lives in the secure web app right now, so mobile opens that directly with your live account and conversation target.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={() => launchMessages()}>
          <Text style={styles.primaryBtnText}>Open Secure Messages</Text>
        </Pressable>
      </SurfaceCard>

      <SurfaceCard style={styles.composeCard}>
        <Text style={styles.sectionTitle}>Start a chat</Text>
        <Text style={styles.sectionSubtitle}>Type a Lulit username just like social DMs.</Text>
        <TextInput
          autoCapitalize="none"
          onChangeText={setRecipient}
          placeholder="@username"
          placeholderTextColor={palette.slate}
          style={styles.input}
          value={recipient}
        />
        <Pressable
          style={[styles.secondaryBtn, !recipient.trim() && styles.secondaryBtnDisabled]}
          onPress={() => launchMessages(recipient)}
          disabled={!recipient.trim()}
        >
          <Text style={styles.secondaryBtnText}>Open Chat</Text>
        </Pressable>
      </SurfaceCard>

      <View style={styles.securityGrid}>
        <SecurityPill accent={palette.cyan} title="Standard Secure" subtitle="Faster everyday encrypted conversations." />
        <SecurityPill accent={palette.mint} title="Private Mode" subtitle="Fresh auth and shorter-lived plaintext for sensitive chats." />
      </View>

      <SurfaceCard style={styles.tipCard}>
        <Text style={styles.sectionTitle}>What carries over from web</Text>
        <Text style={styles.tipText}>Username-based DM threads</Text>
        <Text style={styles.tipText}>Secure message decrypt flow</Text>
        <Text style={styles.tipText}>Private mode for sensitive messages</Text>
        <Text style={styles.tipText}>Live cloud backend and DAO links</Text>
      </SurfaceCard>

      <SurfaceCard style={styles.accountCard}>
        <Text style={styles.sectionTitle}>Signed in mobile account</Text>
        <Text style={styles.accountHandle}>@{user?.username || "lulit"}</Text>
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
  hero: {
    backgroundColor: "rgba(17,24,39,0.94)",
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
    marginTop: 4,
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
  tipCard: {
    gap: 8
  },
  tipText: {
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
