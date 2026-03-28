import { useEffect, useMemo, useState } from "react";
import { Formik } from "formik";
import * as Yup from "yup";
import { Link, useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../hooks/useAuth";
import { claimRecipientPrekey, fetchConversations, fetchEncryptedMessage, fetchThread, getMessagingIdentity, lookupMessagingIdentityByUsername, registerMessagingIdentity, sendEncryptedMessage } from "../services/messagingApi";
import { buildIdentityRegistrationPayload, createEncryptedEnvelope, decryptEnvelope, MESSAGING_SECURITY_MODE } from "../services/messagingCrypto";
import api from "../services/api";
import { clearMessagingSession, getConnectedMessagingWallet, restoreMessagingSession, walletLoginForMessaging } from "../services/walletMessagingAuth";

const composerSchema = Yup.object({
  plaintext: Yup.string().min(1).max(4000).required("Message required")
});

const newChatSchema = Yup.object({
  recipient: Yup.string().min(3, "Enter a username or wallet").required("Recipient is required")
});

const walletPattern = /^0x[a-fA-F0-9]{40}$/;

function messagingErrorMessage(nextError, fallback) {
  const serverMessage = nextError?.response?.data?.message || "";
  const status = nextError?.response?.status;

  if (status === 401 || /401/.test(String(nextError?.message || ""))) {
    return "Session expired. Please login again, then reconnect MetaMask in Messages.";
  }

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
    return "That user needs to reopen Messages and reconnect MetaMask so their secure prekeys can refresh.";
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

export default function MessagesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [walletAddress, setWalletAddress] = useState("");
  const [messageTokenReady, setMessageTokenReady] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [decryptedMessages, setDecryptedMessages] = useState({});
  const [newChatTarget, setNewChatTarget] = useState("");
  const [connectingWallet, setConnectingWallet] = useState(false);

  const selectedWallet = selectedConversation?.walletAddress || "";

  const connectWallet = async () => {
    setError("");
    setStatus("");
    setConnectingWallet(true);
    try {
      const session = await walletLoginForMessaging();
      setWalletAddress(session.walletAddress);
      setMessageTokenReady(true);
      const identityPayload = await buildIdentityRegistrationPayload();
      await registerMessagingIdentity({ ...identityPayload, username: user?.username || "" });
      setStatus("Secure DMs are ready");
    } catch (nextError) {
      setError(messagingErrorMessage(nextError, "Unable to authenticate messaging wallet"));
    } finally {
      setConnectingWallet(false);
    }
  };

  const handleSessionFailure = (nextError) => {
    if ([401, 403].includes(nextError?.response?.status)) {
      clearMessagingSession();
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
        displayName: data.displayName || "",
        avatarUrl: data.avatarUrl || ""
      };
    } catch {
      return {
        walletAddress: wallet,
        username: wallet.slice(0, 8),
        displayName: "",
        avatarUrl: ""
      };
    }
  };

  const loadConversations = async (preferredWallet = "") => {
    try {
      const records = await fetchConversations();
      const enriched = await Promise.all(
        records.map(async (record) => {
          const counterparty = await enrichCounterparty(record.counterpartyWallet);
          return {
            ...record,
            ...counterparty
          };
        })
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
      if (!handleSessionFailure(nextError)) {
        setError(nextError?.response?.data?.message || "Failed to load encrypted inbox");
      }
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
      if (!handleSessionFailure(nextError)) {
        setError(nextError?.response?.data?.message || "Unable to open this conversation");
      }
    }
  };

  useEffect(() => {
    const restored = restoreMessagingSession();
    if (restored.token) {
      setMessageTokenReady(true);
      setWalletAddress(restored.walletAddress);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const connectedWallet = await getConnectedMessagingWallet();
      if (cancelled || !connectedWallet) {
        return;
      }
      setWalletAddress((current) => current || connectedWallet.toLowerCase());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!messageTokenReady) {
      return;
    }
    loadConversations();
  }, [messageTokenReady]);

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
        // Keep the screen usable even if background identity refresh fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [messageTokenReady, user?.username]);

  useEffect(() => {
    if (!selectedConversation) {
      return;
    }
    setSearchParams({ with: selectedConversation.username });
    loadThread(selectedConversation);
  }, [selectedConversation]);

  useEffect(() => {
    const withUsername = searchParams.get("with");
    if (!withUsername || !messageTokenReady) {
      return;
    }

    (async () => {
      try {
        const profile = await resolveRecipientProfile(withUsername);
        const conversation = {
          walletAddress: profile.walletAddress.toLowerCase(),
          username: profile.username,
          displayName: profile.displayName || "",
          avatarUrl: profile.avatarUrl || "",
          previewLabel: "Start a secure conversation",
          messageCount: 0,
          lastMessageAt: null,
          lastDirection: "OUTGOING",
          securityMode: MESSAGING_SECURITY_MODE.STANDARD
        };
        setSelectedConversation((current) => (current?.walletAddress === conversation.walletAddress ? current : conversation));
      } catch {
        // Ignore bad querystring values and let the rest of the screen keep working.
      }
    })();
  }, [searchParams, messageTokenReady]);

  const orderedThread = useMemo(
    () => threadMessages.map((item) => ({
      ...item,
      plaintext: decryptedMessages[item.cid] || ""
    })),
    [threadMessages, decryptedMessages]
  );

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
        window.setTimeout(() => {
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
      if (handleSessionFailure(nextError)) {
        return;
      }
      setError(messagingErrorMessage(nextError, "Unable to decrypt message on this device"));
    }
  };

  const startConversation = async (recipientValue) => {
    const profile = await resolveRecipientProfile(recipientValue);
    if (profile.username?.toLowerCase() === user?.username?.toLowerCase()) {
      throw new Error("Open chat with another account. You are already logged in as this user.");
    }
    const conversation = {
      walletAddress: profile.walletAddress.toLowerCase(),
      username: profile.username,
      displayName: profile.displayName || "",
      avatarUrl: profile.avatarUrl || "",
      previewLabel: "Start a secure conversation",
      messageCount: 0,
      lastMessageAt: null,
      lastDirection: "OUTGOING",
      securityMode: MESSAGING_SECURITY_MODE.STANDARD
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
    setNewChatTarget("");
    setStatus(`Chat opened with @${profile.username}`);
    return conversation;
  };

  return (
    <main className="page-shell">
      <section className="mx-auto max-w-6xl">
        <PageHeader title="Messages" />

        <div className="mb-5 rounded-[1.75rem] border border-white/10 bg-slate-900/75 p-5 text-white shadow-2xl backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-300">Secure DMs with username-style conversations on top and wallet-based encryption underneath.</p>
              <p className="mt-2 text-xs text-slate-400">No raw wallet entry is needed for normal use. Just open a chat with a username and keep MetaMask connected for encryption.</p>
            </div>
            <button className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60" disabled={connectingWallet} onClick={connectWallet} type="button">
              {connectingWallet ? "Connecting..." : messageTokenReady ? "Wallet Ready" : "Connect MetaMask"}
            </button>
          </div>
          {walletAddress ? <p className="mt-3 text-xs text-slate-400">Messaging wallet: {walletAddress}</p> : null}
          {user ? <p className="mt-1 text-xs text-slate-500">Logged in as @{user.username}</p> : null}
        </div>

        <div className="grid gap-5 xl:grid-cols-[340px,1fr]">
          <aside className="rounded-[1.75rem] border border-slate-200/70 bg-white/80 p-4 shadow-xl backdrop-blur">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">New Chat</p>
              <Formik
                initialValues={{ recipient: newChatTarget }}
                enableReinitialize
                validationSchema={newChatSchema}
                onSubmit={async (values, { setSubmitting }) => {
                  setError("");
                  setStatus("");
                  try {
                    if (!messageTokenReady) {
                      throw new Error("Connect MetaMask first");
                    }
                    await startConversation(values.recipient);
                  } catch (nextError) {
                    setError(messagingErrorMessage(nextError, "Unable to start secure chat"));
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                {({ values, errors, touched, handleChange, handleSubmit, isSubmitting }) => (
                  <form className="mt-3 grid gap-2" onSubmit={handleSubmit}>
                    <input
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      name="recipient"
                      onChange={(event) => {
                        setNewChatTarget(event.target.value);
                        handleChange(event);
                      }}
                      placeholder="@username"
                      value={values.recipient}
                    />
                    {touched.recipient && errors.recipient ? <p className="text-xs text-rose-600">{errors.recipient}</p> : null}
                    <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800" disabled={isSubmitting} type="submit">
                      Open Chat
                    </button>
                  </form>
                )}
              </Formik>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Conversations</p>
              <button className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100" onClick={() => loadConversations()} type="button">
                Refresh
              </button>
            </div>

            <div className="grid gap-2">
              {conversations.map((item) => {
                const isActive = selectedWallet && item.walletAddress.toLowerCase() === selectedWallet.toLowerCase();
                return (
                  <button
                    className={`rounded-2xl border px-4 py-3 text-left transition ${isActive ? "border-cyan-400 bg-cyan-50 shadow-md" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                    key={item.walletAddress}
                    onClick={() => setSelectedConversation(item)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">@{item.username}</p>
                        {item.displayName ? <p className="truncate text-xs text-slate-500">{item.displayName}</p> : null}
                        <p className="mt-1 truncate text-xs text-slate-500">{item.previewLabel}</p>
                      </div>
                      <span className="text-xs font-semibold text-slate-400">{formatRelativeTimestamp(item.lastMessageAt)}</span>
                    </div>
                  </button>
                );
              })}
              {!conversations.length ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  No chats yet. Start with a username and it will feel like DMs, not email.
                </div>
              ) : null}
            </div>
          </aside>

          <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/70 text-white shadow-2xl backdrop-blur">
            {selectedConversation ? (
              <>
                <div className="border-b border-white/10 px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">@{selectedConversation.username}</p>
                      <p className="text-xs text-slate-400">
                        {selectedConversation.displayName || "Secure conversation"} {selectedConversation.walletAddress ? `• ${selectedConversation.walletAddress}` : ""}
                      </p>
                    </div>
                    <Link className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5" to={`/profile/${selectedConversation.username}`}>
                      Open Profile
                    </Link>
                  </div>
                </div>

                <div className="grid gap-3 px-5 py-5">
                  {orderedThread.map((item) => {
                    const isOutgoing = item.direction === "OUTGOING";
                    return (
                      <div className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`} key={item.id}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isOutgoing ? "bg-cyan-500/20 text-cyan-50" : "bg-white/8 text-slate-100"}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                              {isOutgoing ? "You" : `@${selectedConversation.username}`}
                            </span>
                            <span className="text-[11px] text-slate-400">{formatRelativeTimestamp(item.createdAt)}</span>
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold">
                              {item.securityMode === MESSAGING_SECURITY_MODE.PRIVATE ? "Private" : "Secure"}
                            </span>
                          </div>
                          {item.plaintext ? (
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.plaintext}</p>
                          ) : (
                            <button className="mt-3 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/8" onClick={() => handleDecrypt(item)} type="button">
                              {item.securityMode === MESSAGING_SECURITY_MODE.PRIVATE ? "Unlock Private Message" : "Decrypt Message"}
                            </button>
                          )}
                          {item.securityMode === MESSAGING_SECURITY_MODE.PRIVATE && item.plaintext ? (
                            <p className="mt-2 text-[11px] text-emerald-200">Private message auto-clears after 45 seconds.</p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  {!orderedThread.length ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-slate-400">
                      No messages in this chat yet. Send the first secure DM below.
                    </div>
                  ) : null}
                </div>

                <div className="border-t border-white/10 px-5 py-4">
                  <Formik
                    initialValues={{ plaintext: "", securityMode: MESSAGING_SECURITY_MODE.STANDARD }}
                    validationSchema={composerSchema}
                    onSubmit={async (values, { resetForm, setSubmitting }) => {
                      setError("");
                      setStatus("");
                      try {
                        if (!messageTokenReady || !walletAddress) {
                          throw new Error("Connect MetaMask first");
                        }
                        if (values.securityMode === MESSAGING_SECURITY_MODE.PRIVATE) {
                          await walletLoginForMessaging();
                        }

                        const recipientWallet = selectedConversation.walletAddress.toLowerCase();
                        await getMessagingIdentity(recipientWallet);
                        const recipientPrekey = await claimRecipientPrekey(recipientWallet);
                        const { envelope, envelopeDigest } = await createEncryptedEnvelope({
                          plaintext: values.plaintext,
                          senderWallet: walletAddress,
                          recipientWallet,
                          recipientPrekey,
                          securityMode: values.securityMode
                        });

                        await sendEncryptedMessage({
                          recipientWallet,
                          envelope,
                          envelopeDigest,
                          prekeyId: recipientPrekey.id,
                          securityMode: values.securityMode,
                          signatureBundle: {
                            walletAddress
                          }
                        });

                        setStatus(values.securityMode === MESSAGING_SECURITY_MODE.PRIVATE
                          ? `Private DM sent to @${selectedConversation.username}`
                          : `Secure DM sent to @${selectedConversation.username}`);
                        resetForm();
                        await loadConversations(selectedConversation.walletAddress);
                        await loadThread(selectedConversation);
                      } catch (nextError) {
                        if (handleSessionFailure(nextError)) {
                          return;
                        }
                        setError(messagingErrorMessage(nextError, "Unable to send secure DM"));
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                  >
                    {({ values, errors, touched, handleChange, handleSubmit, isSubmitting }) => (
                      <form className="grid gap-3" onSubmit={handleSubmit}>
                        <textarea
                          className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500"
                          name="plaintext"
                          onChange={handleChange}
                          placeholder={`Message @${selectedConversation.username}`}
                          rows={4}
                          value={values.plaintext}
                        />
                        {touched.plaintext && errors.plaintext ? <p className="text-xs text-rose-300">{errors.plaintext}</p> : null}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap gap-2">
                            <label className={`rounded-full border px-3 py-2 text-xs font-semibold ${values.securityMode === MESSAGING_SECURITY_MODE.STANDARD ? "border-cyan-400 bg-cyan-500/10 text-cyan-100" : "border-white/10 bg-white/5 text-slate-300"}`}>
                              <input checked={values.securityMode === MESSAGING_SECURITY_MODE.STANDARD} className="mr-2" name="securityMode" onChange={handleChange} type="radio" value={MESSAGING_SECURITY_MODE.STANDARD} />
                              Standard Secure
                            </label>
                            <label className={`rounded-full border px-3 py-2 text-xs font-semibold ${values.securityMode === MESSAGING_SECURITY_MODE.PRIVATE ? "border-emerald-400 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/5 text-slate-300"}`}>
                              <input checked={values.securityMode === MESSAGING_SECURITY_MODE.PRIVATE} className="mr-2" name="securityMode" onChange={handleChange} type="radio" value={MESSAGING_SECURITY_MODE.PRIVATE} />
                              Private Mode
                            </label>
                          </div>
                          <button className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-400" disabled={isSubmitting} type="submit">
                            {isSubmitting ? "Encrypting..." : "Send DM"}
                          </button>
                        </div>
                      </form>
                    )}
                  </Formik>
                </div>
              </>
            ) : (
              <div className="flex min-h-[520px] items-center justify-center px-6 text-center">
                <div>
                  <p className="text-xl font-semibold text-white">Choose a conversation</p>
                  <p className="mt-2 text-sm text-slate-400">Open a username-based secure DM from the left side, or start one from a profile.</p>
                </div>
              </div>
            )}
          </section>
        </div>

        {status ? <p className="mt-4 text-sm text-emerald-700">{status}</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
      </section>
    </main>
  );
}
