import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import ScreenShell from "../components/ScreenShell";
import SurfaceCard from "../components/SurfaceCard";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  claimRecipientPrekey,
  fetchConversations,
  fetchEncryptedMessage,
  fetchThread,
  getMessagingIdentity,
  lookupMessagingIdentityByUsername,
  registerMessagingIdentity,
  sendEncryptedMessage
} from "../services/messagingApi";
import {
  buildIdentityRegistrationPayload,
  createEncryptedEnvelope,
  decryptEnvelope,
  MESSAGING_SECURITY_MODE
} from "../services/messagingCrypto";
import {
  clearMessagingSession,
  restoreMessagingSession,
  walletLoginForMessaging
} from "../services/walletMessagingAuth";
import { palette, radius } from "../theme";

const walletPattern = /^0x[a-fA-F0-9]{40}$/;

function messagingErrorMessage(nextError, fallback) {
  const serverMessage = nextError?.response?.data?.message || "";
  const status = nextError?.response?.status;

  if (
    status === 404 &&
    /Messaging identity not found/i.test(serverMessage)
  ) {
    return "That user has not set up secure messages yet. Ask them to open Messages and connect MetaMask once.";
  }

  if (
    status === 400 &&
    /Recipient has no messaging prekeys registered/i.test(serverMessage)
  ) {
    return "That user needs to reopen Messages and reconnect MetaMask so their secure keys can refresh.";
  }

  return serverMessage || nextError.message || fallback;
}

function normalizeRecipientInput(value) {
  return String(value || "").trim().replace(/^@/, "");
}

function formatRelativeTimestamp(value) {
  if (!value) {
    return "";
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h`;
  }
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d`;
}

function ConversationCard({ item, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chatCard, active && styles.chatCardActive]}>
      <View style={styles.chatCardHeader}>
        <View style={styles.chatIdentity}>
          <View style={[styles.chatAvatar, active && styles.chatAvatarActive]}>
            <Text style={[styles.chatAvatarText, active && styles.chatAvatarTextActive]}>
              {String(item.username || "L").slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.chatHandle}>@{item.username}</Text>
            {item.displayName ? <Text style={styles.chatName}>{item.displayName}</Text> : null}
          </View>
        </View>
        <Text style={styles.chatTime}>{formatRelativeTimestamp(item.lastMessageAt)}</Text>
      </View>
      <Text numberOfLines={1} style={styles.chatPreview}>{item.previewLabel || "Secure conversation"}</Text>
    </Pressable>
  );
}

function MessageBubble({ item, username, plaintext, onDecrypt }) {
  const isOutgoing = item.direction === "OUTGOING";
  return (
    <View style={[styles.bubbleWrap, isOutgoing ? styles.bubbleWrapRight : styles.bubbleWrapLeft]}>
      <View style={[styles.bubble, isOutgoing ? styles.outgoingBubble : styles.incomingBubble]}>
        <View style={styles.bubbleMetaRow}>
          <Text style={styles.bubbleLabel}>{isOutgoing ? "You" : `@${username}`}</Text>
          <Text style={styles.bubbleMeta}>{formatRelativeTimestamp(item.createdAt)}</Text>
          <Text style={[styles.modeChip, item.securityMode === MESSAGING_SECURITY_MODE.PRIVATE ? styles.modeChipPrivate : styles.modeChipStandard]}>
            {item.securityMode === MESSAGING_SECURITY_MODE.PRIVATE ? "Private" : "Secure"}
          </Text>
        </View>
        {plaintext ? (
          <Text style={styles.bubbleText}>{plaintext}</Text>
        ) : (
          <Pressable onPress={onDecrypt} style={styles.decryptBtn}>
            <Text style={styles.decryptBtnText}>
              {item.securityMode === MESSAGING_SECURITY_MODE.PRIVATE ? "Unlock Private Message" : "Decrypt Message"}
            </Text>
          </Pressable>
        )}
        {item.securityMode === MESSAGING_SECURITY_MODE.PRIVATE && plaintext ? (
          <Text style={styles.privateHint}>Private message auto-clears after 45 seconds.</Text>
        ) : null}
      </View>
    </View>
  );
}

async function resolveRecipientProfile(value) {
  const normalized = normalizeRecipientInput(value);
  if (!normalized) {
    throw new Error("Recipient is required");
  }

  if (walletPattern.test(normalized)) {
    const { data } = await api.get(`/profile/wallet/${normalized}`);
    if (!data?.walletAddress) {
      throw new Error("This wallet is not connected to a Lulit profile yet");
    }
    return data;
  }

  const { data } = await api.get(`/profile/${normalized}`);
  if (!data?.walletAddress) {
    try {
      const identity = await lookupMessagingIdentityByUsername(data?.username || normalized);
      return {
        ...data,
        walletAddress: identity.walletAddress
      };
    } catch {
      throw new Error(`@${data?.username || normalized} has not connected a wallet yet`);
    }
  }
  return data;
}

export default function MessagesScreen() {
  const { user } = useAuth();
  const [walletAddress, setWalletAddress] = useState("");
  const [messageTokenReady, setMessageTokenReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [recipient, setRecipient] = useState("");
  const [draft, setDraft] = useState("");
  const [securityMode, setSecurityMode] = useState(MESSAGING_SECURITY_MODE.STANDARD);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [decryptedMessages, setDecryptedMessages] = useState({});
  const [sending, setSending] = useState(false);

  const selectedWallet = selectedConversation?.walletAddress || "";

  const handleSessionFailure = async (nextError) => {
    if ([401, 403].includes(nextError?.response?.status)) {
      await clearMessagingSession();
      setMessageTokenReady(false);
      setWalletAddress("");
      setConversations([]);
      setThreadMessages([]);
      setSelectedConversation(null);
      setError("Secure messaging session expired. Connect MetaMask again.");
      return true;
    }
    return false;
  };

  const enrichCounterparty = async (wallet) => {
    try {
      const { data } = await api.get(`/profile/wallet/${wallet}`);
      return {
        walletAddress: wallet,
        username: data.username,
        displayName: data.displayName || ""
      };
    } catch {
      return {
        walletAddress: wallet,
        username: wallet.slice(0, 8),
        displayName: ""
      };
    }
  };

  const loadConversations = async (preferredWallet = "") => {
    try {
      const records = await fetchConversations();
      const enriched = await Promise.all(
        records.map(async (record) => ({
          ...record,
          ...(await enrichCounterparty(record.counterpartyWallet))
        }))
      );
      setConversations(enriched);

      const pickedWallet = preferredWallet || selectedWallet || enriched[0]?.walletAddress || "";
      if (pickedWallet) {
        const picked = enriched.find((item) => item.walletAddress.toLowerCase() === pickedWallet.toLowerCase());
        if (picked) {
          setSelectedConversation(picked);
        }
      }
    } catch (nextError) {
      if (!(await handleSessionFailure(nextError))) {
        setError(nextError?.response?.data?.message || "Failed to load encrypted inbox");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadThread = async (conversation) => {
    if (!conversation?.walletAddress) {
      setThreadMessages([]);
      return;
    }

    try {
      const records = await fetchThread(conversation.walletAddress);
      setThreadMessages(records);
    } catch (nextError) {
      if (!(await handleSessionFailure(nextError))) {
        setError(nextError?.response?.data?.message || "Unable to open this conversation");
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const restored = await restoreMessagingSession();
      if (!mounted) {
        return;
      }
      if (restored.token) {
        setMessageTokenReady(true);
        setWalletAddress(restored.walletAddress);
        await loadConversations();
      } else {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedConversation) {
      return;
    }
    loadThread(selectedConversation);
  }, [selectedConversation]);

  useEffect(() => {
    if (!messageTokenReady || !user?.username) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const identityPayload = await buildIdentityRegistrationPayload();
        if (cancelled) {
          return;
        }
        await registerMessagingIdentity({ ...identityPayload, username: user.username });
      } catch {
        // Ignore background refresh errors so the rest of the screen still works.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [messageTokenReady, user?.username]);

  const connectWallet = async () => {
    setError("");
    setStatus("");
    try {
      const session = await walletLoginForMessaging();
      setWalletAddress(session.walletAddress);
      setMessageTokenReady(true);
      const identityPayload = await buildIdentityRegistrationPayload();
      await registerMessagingIdentity({ ...identityPayload, username: user?.username || "" });
      await loadConversations();
      setStatus("Secure DMs are ready");
    } catch (nextError) {
      setError(nextError?.response?.data?.message || nextError.message || "Unable to authenticate messaging wallet");
    }
  };

  const startConversation = async () => {
    setError("");
    setStatus("");
    if (!messageTokenReady) {
      setError("Connect MetaMask first");
      return;
    }
    try {
      const profile = await resolveRecipientProfile(recipient);
      if (profile.username?.toLowerCase() === user?.username?.toLowerCase()) {
        throw new Error("Open chat with another account. You are already logged in as this user.");
      }
      const conversation = {
        walletAddress: profile.walletAddress.toLowerCase(),
        username: profile.username,
        displayName: profile.displayName || "",
        previewLabel: "Start a secure conversation",
        lastMessageAt: null
      };
      setConversations((current) => {
        const exists = current.some((item) => item.walletAddress.toLowerCase() === conversation.walletAddress);
        if (exists) {
          return current;
        }
        return [conversation, ...current];
      });
      setSelectedConversation(conversation);
      setThreadMessages([]);
      setDecryptedMessages({});
      setStatus(`Chat opened with @${profile.username}`);
      setRecipient("");
    } catch (nextError) {
      setError(messagingErrorMessage(nextError, "Unable to start secure chat"));
    }
  };

  const handleDecrypt = async (item) => {
    setError("");
    try {
      if (item.securityMode === MESSAGING_SECURITY_MODE.PRIVATE) {
        await walletLoginForMessaging();
      }
      const { envelope } = await fetchEncryptedMessage(item.cid);
      const senderIdentity = item.direction === "INCOMING"
        ? await getMessagingIdentity(item.senderWallet)
        : null;
      const plaintext = await decryptEnvelope(
        envelope,
        senderIdentity?.signingPublicKey || envelope.senderSigningPublicKey || ""
      );
      setDecryptedMessages((current) => ({
        ...current,
        [item.cid]: plaintext
      }));

      if (item.securityMode === MESSAGING_SECURITY_MODE.PRIVATE) {
        setTimeout(() => {
          setDecryptedMessages((current) => {
            const next = { ...current };
            delete next[item.cid];
            return next;
          });
        }, 45000);
      }

      const identityPayload = await buildIdentityRegistrationPayload();
      await registerMessagingIdentity({ ...identityPayload, username: user?.username || "" });
    } catch (nextError) {
      if (await handleSessionFailure(nextError)) {
        return;
      }
      setError(messagingErrorMessage(nextError, "Unable to decrypt this message on device"));
    }
  };

  const handleSend = async () => {
    setError("");
    setStatus("");

    if (!selectedConversation?.walletAddress) {
      setError("Open or start a conversation first");
      return;
    }
    if (!draft.trim()) {
      setError("Message required");
      return;
    }
    if (!messageTokenReady || !walletAddress) {
      setError("Connect MetaMask first");
      return;
    }

    setSending(true);
    try {
      if (securityMode === MESSAGING_SECURITY_MODE.PRIVATE) {
        await walletLoginForMessaging();
      }

      const recipientWallet = selectedConversation.walletAddress.toLowerCase();
      await getMessagingIdentity(recipientWallet);
      const recipientPrekey = await claimRecipientPrekey(recipientWallet);
      const { envelope, envelopeDigest } = await createEncryptedEnvelope({
        plaintext: draft,
        senderWallet: walletAddress,
        recipientWallet,
        recipientPrekey,
        securityMode
      });

      await sendEncryptedMessage({
        recipientWallet,
        envelope,
        envelopeDigest,
        prekeyId: recipientPrekey.id,
        securityMode,
        signatureBundle: {
          walletAddress
        }
      });

      setDraft("");
      setStatus(securityMode === MESSAGING_SECURITY_MODE.PRIVATE
        ? `Private DM sent to @${selectedConversation.username}`
        : `Secure DM sent to @${selectedConversation.username}`);
      await loadConversations(recipientWallet);
      await loadThread(selectedConversation);
    } catch (nextError) {
      if (await handleSessionFailure(nextError)) {
        return;
      }
      setError(messagingErrorMessage(nextError, "Unable to send secure DM"));
    } finally {
      setSending(false);
    }
  };

  const orderedThread = useMemo(
    () => threadMessages.map((item) => ({
      ...item,
      plaintext: decryptedMessages[item.cid] || ""
    })),
    [threadMessages, decryptedMessages]
  );

  return (
    <ScreenShell
      eyebrow="Private Space"
      title="Messages"
      subtitle="Native secure DMs with wallet-auth identity, on-device encryption, and shared live state with the web app."
      scroll
      bodyStyle={styles.content}
    >
      <View style={styles.heroPanel}>
        <Text style={styles.kicker}>Secure DMs</Text>
        <Text style={styles.headline}>This is now a native mobile inbox, not just a launcher.</Text>
        <Text style={styles.subhead}>Username-style conversations on top, wallet-backed encryption underneath, synced with the same live messaging service as the web app.</Text>
        <Pressable style={styles.primaryBtn} onPress={connectWallet}>
          <Text style={styles.primaryBtnText}>{messageTokenReady ? "Wallet Ready" : "Connect MetaMask"}</Text>
        </Pressable>
        {walletAddress ? <Text style={styles.walletMeta}>Messaging wallet: {walletAddress}</Text> : null}
        {user ? <Text style={styles.walletMeta}>Signed in as @{user.username}</Text> : null}
      </View>

      <SurfaceCard style={styles.composeCard}>
        <Text style={styles.sectionTitle}>New chat</Text>
        <TextInput
          autoCapitalize="none"
          onChangeText={setRecipient}
          placeholder="@username"
          placeholderTextColor={palette.slate}
          style={styles.input}
          value={recipient}
        />
        <Pressable style={[styles.secondaryBtn, !recipient.trim() && styles.secondaryBtnDisabled]} onPress={startConversation} disabled={!recipient.trim()}>
          <Text style={styles.secondaryBtnText}>Open chat</Text>
        </Pressable>
      </SurfaceCard>

      <View style={styles.securityGrid}>
        <Pressable onPress={() => setSecurityMode(MESSAGING_SECURITY_MODE.STANDARD)} style={[styles.modeCard, securityMode === MESSAGING_SECURITY_MODE.STANDARD && styles.modeCardActiveStandard]}>
          <Text style={styles.modeTitle}>Standard Secure</Text>
          <Text style={styles.modeSubtitle}>Faster everyday encrypted chat.</Text>
        </Pressable>
        <Pressable onPress={() => setSecurityMode(MESSAGING_SECURITY_MODE.PRIVATE)} style={[styles.modeCard, securityMode === MESSAGING_SECURITY_MODE.PRIVATE && styles.modeCardActivePrivate]}>
          <Text style={styles.modeTitle}>Private Mode</Text>
          <Text style={styles.modeSubtitle}>Fresh auth and short-lived plaintext for sensitive chats.</Text>
        </Pressable>
      </View>

      <SurfaceCard style={styles.listCard}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Conversations</Text>
          <Pressable onPress={() => loadConversations()}>
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>
        {loading ? (
          <ActivityIndicator color={palette.blue} />
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.walletAddress}
            renderItem={({ item }) => (
              <ConversationCard
                item={item}
                active={selectedWallet.toLowerCase() === item.walletAddress.toLowerCase()}
                onPress={() => setSelectedConversation(item)}
              />
            )}
            scrollEnabled={false}
            ListEmptyComponent={<Text style={styles.emptyText}>No secure chats yet.</Text>}
          />
        )}
      </SurfaceCard>

      <SurfaceCard style={styles.threadCard}>
        <View style={styles.sectionRow}>
          <View>
            <Text style={styles.sectionTitle}>{selectedConversation ? `@${selectedConversation.username}` : "Conversation"}</Text>
            <Text style={styles.sectionSubtitle}>{selectedConversation ? "Messages here sync with the live web app too." : "Open a conversation to send or decrypt."}</Text>
          </View>
        </View>

        {orderedThread.length ? (
          orderedThread.map((item) => (
            <MessageBubble
              item={item}
              key={item.id}
              plaintext={item.plaintext}
              username={selectedConversation?.username || "username"}
              onDecrypt={() => handleDecrypt(item)}
            />
          ))
        ) : (
          <Text style={styles.emptyText}>No messages in this chat yet.</Text>
        )}

        <TextInput
          editable={Boolean(selectedConversation)}
          multiline
          onChangeText={setDraft}
          placeholder={selectedConversation ? `Message @${selectedConversation.username}` : "Open a conversation first"}
          placeholderTextColor={palette.slate}
          style={[styles.input, styles.messageInput, !selectedConversation && styles.inputDisabled]}
          value={draft}
        />
        <Pressable
          style={[styles.sendBtn, (!selectedConversation || sending) && styles.secondaryBtnDisabled]}
          onPress={handleSend}
          disabled={!selectedConversation || sending}
        >
          <Text style={styles.sendBtnText}>{sending ? "Encrypting..." : "Send DM"}</Text>
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
  walletMeta: {
    color: "#94a3b8",
    fontSize: 12
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
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
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
  inputDisabled: {
    opacity: 0.55
  },
  messageInput: {
    minHeight: 94,
    paddingTop: 12,
    textAlignVertical: "top",
    marginTop: 12
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
  modeCard: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.md,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.92)"
  },
  modeCardActiveStandard: {
    borderColor: palette.cyan,
    backgroundColor: "rgba(14,165,233,0.12)"
  },
  modeCardActivePrivate: {
    borderColor: palette.mint,
    backgroundColor: "rgba(16,185,129,0.12)"
  },
  modeTitle: {
    color: palette.ink,
    fontWeight: "900"
  },
  modeSubtitle: {
    marginTop: 4,
    color: palette.inkSoft,
    lineHeight: 20
  },
  listCard: {
    gap: 8
  },
  threadCard: {
    gap: 8
  },
  chatCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10
  },
  chatCardActive: {
    borderColor: "rgba(34,211,238,0.48)",
    backgroundColor: "rgba(34,211,238,0.08)"
  },
  chatCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  chatIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dbeafe"
  },
  chatAvatarActive: {
    backgroundColor: palette.blue
  },
  chatAvatarText: {
    color: palette.ink,
    fontWeight: "900"
  },
  chatAvatarTextActive: {
    color: "#ffffff"
  },
  chatHandle: {
    color: palette.ink,
    fontWeight: "900"
  },
  chatName: {
    color: palette.slate,
    marginTop: 2,
    fontSize: 12
  },
  chatTime: {
    color: palette.slate,
    fontSize: 12,
    fontWeight: "700"
  },
  chatPreview: {
    color: palette.inkSoft,
    marginTop: 8
  },
  bubbleWrap: {
    marginBottom: 10
  },
  bubbleWrapLeft: {
    alignItems: "flex-start"
  },
  bubbleWrapRight: {
    alignItems: "flex-end"
  },
  bubble: {
    maxWidth: "84%",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  incomingBubble: {
    backgroundColor: "#0f172a"
  },
  outgoingBubble: {
    backgroundColor: "rgba(34,211,238,0.18)"
  },
  bubbleMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6
  },
  bubbleLabel: {
    color: "#e2e8f0",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  bubbleMeta: {
    color: "#94a3b8",
    fontSize: 11
  },
  modeChip: {
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "800"
  },
  modeChipStandard: {
    color: "#cffafe",
    backgroundColor: "rgba(34,211,238,0.14)"
  },
  modeChipPrivate: {
    color: "#bbf7d0",
    backgroundColor: "rgba(16,185,129,0.14)"
  },
  bubbleText: {
    color: "#f8fafc",
    marginTop: 8,
    lineHeight: 21
  },
  decryptBtn: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: "flex-start"
  },
  decryptBtnText: {
    color: "#f8fafc",
    fontWeight: "800",
    fontSize: 12
  },
  privateHint: {
    color: "#bbf7d0",
    marginTop: 8,
    fontSize: 11
  },
  refreshText: {
    color: palette.blue,
    fontWeight: "800"
  },
  sendBtn: {
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.mint,
    marginTop: 10
  },
  sendBtnText: {
    color: "#ffffff",
    fontWeight: "900"
  },
  emptyText: {
    color: palette.slate,
    textAlign: "center",
    paddingVertical: 16
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
