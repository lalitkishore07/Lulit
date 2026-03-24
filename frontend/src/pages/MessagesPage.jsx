import { useEffect, useState } from "react";
import { Formik } from "formik";
import * as Yup from "yup";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../hooks/useAuth";
import { claimRecipientPrekey, fetchEncryptedMessage, fetchInbox, getMessagingIdentity, registerMessagingIdentity, sendEncryptedMessage } from "../services/messagingApi";
import { buildIdentityRegistrationPayload, createEncryptedEnvelope, decryptEnvelope, MESSAGING_SECURITY_MODE } from "../services/messagingCrypto";
import api from "../services/api";
import { clearMessagingSession, restoreMessagingSession, walletLoginForMessaging } from "../services/walletMessagingAuth";

const schema = Yup.object({
  recipient: Yup.string().min(3, "Enter a username or wallet").required("Recipient is required"),
  plaintext: Yup.string().min(1).max(4000).required("Message required")
});

const walletPattern = /^0x[a-fA-F0-9]{40}$/;

function normalizeRecipientInput(value) {
  return String(value || "").trim().replace(/^@/, "");
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
    throw new Error(`@${data?.username || normalized} has not connected a wallet yet`);
  }
  return data;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [walletAddress, setWalletAddress] = useState("");
  const [messageTokenReady, setMessageTokenReady] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [inbox, setInbox] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState("");
  const [selectedMode, setSelectedMode] = useState("");
  const [recipientPreview, setRecipientPreview] = useState(null);

  useEffect(() => {
    if (!selectedMode) {
      return undefined;
    }
    if (selectedMode !== MESSAGING_SECURITY_MODE.PRIVATE) {
      return undefined;
    }
    const timer = window.setTimeout(() => setSelectedMessage(""), 45000);
    return () => window.clearTimeout(timer);
  }, [selectedMode, selectedMessage]);

  const loadInbox = async () => {
    try {
      const nextInbox = await fetchInbox();
      const senderWallets = [...new Set(
        nextInbox
          .filter((item) => item.securityMode !== MESSAGING_SECURITY_MODE.PRIVATE && item.senderWallet)
          .map((item) => item.senderWallet.toLowerCase())
      )];

      const lookupEntries = await Promise.all(
        senderWallets.map(async (senderWallet) => {
          try {
            const { data } = await api.get(`/profile/wallet/${senderWallet}`);
            return [senderWallet, data];
          } catch {
            return [senderWallet, null];
          }
        })
      );

      const profileMap = new Map(lookupEntries);
      setInbox(nextInbox.map((item) => {
        if (item.securityMode === MESSAGING_SECURITY_MODE.PRIVATE) {
          return item;
        }
        const senderProfile = profileMap.get(item.senderWallet?.toLowerCase());
        return {
          ...item,
          senderLabel: senderProfile?.username ? `@${senderProfile.username}` : item.senderLabel || item.senderWallet,
          senderDisplayName: senderProfile?.displayName || ""
        };
      }));
    } catch (nextError) {
      if ([401, 403].includes(nextError?.response?.status)) {
        clearMessagingSession();
        setMessageTokenReady(false);
        setWalletAddress("");
        setInbox([]);
        setError("Secure messaging session expired. Connect MetaMask again to load your inbox.");
        return;
      }
      setError(nextError?.response?.data?.message || "Failed to load encrypted inbox");
    }
  };

  useEffect(() => {
    const restored = restoreMessagingSession();
    if (restored.token) {
      setMessageTokenReady(true);
      setWalletAddress(restored.walletAddress);
      loadInbox();
    }
  }, []);

  const connectWallet = async () => {
    setError("");
    setStatus("");
    try {
      const session = await walletLoginForMessaging();
      setWalletAddress(session.walletAddress);
      setMessageTokenReady(true);
      const identityPayload = await buildIdentityRegistrationPayload();
      await registerMessagingIdentity(identityPayload);
      await loadInbox();
      setStatus("Wallet-authenticated secure messaging is ready");
    } catch (nextError) {
      setError(nextError?.response?.data?.message || nextError.message || "Unable to authenticate messaging wallet");
    }
  };

  const handleDecrypt = async (item) => {
    setError("");
    try {
      if (item.securityMode === MESSAGING_SECURITY_MODE.PRIVATE) {
        await walletLoginForMessaging();
      }
      const { envelope } = await fetchEncryptedMessage(item.cid);
      const plaintext = await decryptEnvelope(envelope);
      setSelectedMessage(plaintext);
      setSelectedMode(item.securityMode || MESSAGING_SECURITY_MODE.STANDARD);
      const identityPayload = await buildIdentityRegistrationPayload();
      await registerMessagingIdentity(identityPayload);
    } catch (nextError) {
      setError(nextError?.response?.data?.message || nextError.message || "Unable to decrypt message on this device");
    }
  };

  return (
    <main className="page-shell">
      <section className="mx-auto max-w-5xl">
        <PageHeader title="Secure Messages" />
        <div className="grid gap-5 lg:grid-cols-[1.1fr,0.9fr]">
          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-white shadow-xl backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-300">Hybrid E2EE using libsodium one-time prekeys, plus Kyber wrapping for quantum-resistant readiness.</p>
                <p className="mt-2 text-xs text-slate-400">People can message by username, while encryption still resolves to their connected wallet behind the scenes.</p>
              </div>
              <button className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400" onClick={connectWallet} type="button">
                {messageTokenReady ? "Wallet Ready" : "Connect MetaMask"}
              </button>
            </div>
            {walletAddress ? <p className="mt-3 text-xs text-slate-400">Messaging wallet: {walletAddress}</p> : null}
            {user ? <p className="mt-1 text-xs text-slate-500">App user: @{user.username}</p> : null}

            <Formik
              initialValues={{ recipient: "", plaintext: "", securityMode: MESSAGING_SECURITY_MODE.STANDARD }}
              validationSchema={schema}
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

                  const recipientProfile = await resolveRecipientProfile(values.recipient);
                  const recipientWallet = recipientProfile.walletAddress.toLowerCase();
                  setRecipientPreview(recipientProfile);
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
                    ? `Private message locked for @${recipientProfile.username}, uploaded to IPFS, and routed with reduced inbox metadata`
                    : `Encrypted message sent securely to @${recipientProfile.username}`);
                  resetForm();
                  await loadInbox();
                } catch (nextError) {
                  setError(nextError?.response?.data?.message || nextError.message || "Unable to send encrypted message");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {({ values, errors, touched, handleChange, handleSubmit, isSubmitting }) => (
                <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
                  <div className="grid gap-1">
                    <label className="text-sm font-semibold">Recipient</label>
                    <input className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2" name="recipient" onChange={handleChange} placeholder="@username" value={values.recipient} />
                    <p className="text-xs text-slate-400">Use a Lulit username like Instagram. The wallet stays underneath the security layer.</p>
                    {touched.recipient && errors.recipient ? <p className="text-xs text-rose-300">{errors.recipient}</p> : null}
                  </div>
                  {recipientPreview?.username ? (
                    <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                      Last resolved recipient: @{recipientPreview.username} {recipientPreview.displayName ? `(${recipientPreview.displayName})` : ""} {recipientPreview.walletAddress ? `- ${recipientPreview.walletAddress}` : ""}
                    </div>
                  ) : null}
                  <div className="grid gap-1">
                    <label className="text-sm font-semibold">Plaintext Message</label>
                    <textarea className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2" name="plaintext" onChange={handleChange} rows={7} value={values.plaintext} />
                    {touched.plaintext && errors.plaintext ? <p className="text-xs text-rose-300">{errors.plaintext}</p> : null}
                  </div>
                  <div className="grid gap-2">
                    <p className="text-sm font-semibold">Security Mode</p>
                    <label className={`rounded-xl border px-3 py-3 ${values.securityMode === MESSAGING_SECURITY_MODE.STANDARD ? "border-cyan-400 bg-cyan-500/10" : "border-slate-600 bg-slate-800"}`}>
                      <input checked={values.securityMode === MESSAGING_SECURITY_MODE.STANDARD} className="mr-2" name="securityMode" onChange={handleChange} type="radio" value={MESSAGING_SECURITY_MODE.STANDARD} />
                      <span className="font-semibold">Standard Secure</span>
                      <span className="ml-2 text-xs text-slate-300">Fast E2EE with persistent inbox metadata.</span>
                    </label>
                    <label className={`rounded-xl border px-3 py-3 ${values.securityMode === MESSAGING_SECURITY_MODE.PRIVATE ? "border-emerald-400 bg-emerald-500/10" : "border-slate-600 bg-slate-800"}`}>
                      <input checked={values.securityMode === MESSAGING_SECURITY_MODE.PRIVATE} className="mr-2" name="securityMode" onChange={handleChange} type="radio" value={MESSAGING_SECURITY_MODE.PRIVATE} />
                      <span className="font-semibold">Private Mode</span>
                      <span className="ml-2 text-xs text-slate-300">Fresh wallet auth, reduced inbox metadata, and auto-cleared plaintext after decrypt.</span>
                    </label>
                  </div>
                  <button className="rounded-xl bg-emerald-500 py-2 font-semibold text-white hover:bg-emerald-400" disabled={isSubmitting} type="submit">
                    {isSubmitting ? "Encrypting..." : "Encrypt, Upload, Send"}
                  </button>
                </form>
              )}
            </Formik>

            {status ? <p className="mt-3 text-sm text-emerald-300">{status}</p> : null}
            {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
          </section>

          <section className="rounded-2xl border border-slate-300/50 bg-white/80 p-5 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">Encrypted Inbox</h2>
              <button className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100" onClick={loadInbox} type="button">
                Refresh
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              {inbox.map((item) => (
                <article className="rounded-xl border border-slate-200 bg-white p-3" key={item.id}>
                  <p className="text-xs uppercase tracking-wide text-slate-500">From</p>
                  <p className="text-sm font-semibold text-slate-900">{item.senderLabel || item.senderWallet}</p>
                  {item.senderDisplayName ? <p className="text-xs text-slate-500">{item.senderDisplayName}</p> : null}
                  <p className="mt-1 text-xs font-semibold text-slate-500">{item.securityMode === MESSAGING_SECURITY_MODE.PRIVATE ? "Private Mode" : "Standard Secure"}</p>
                  <p className="mt-2 text-xs text-slate-500">CID: {item.cid}</p>
                  <button className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800" onClick={() => handleDecrypt(item)} type="button">
                    {item.securityMode === MESSAGING_SECURITY_MODE.PRIVATE ? "Unlock Private Message" : "Decrypt On Device"}
                  </button>
                </article>
              ))}
              {!inbox.length ? <p className="text-sm text-slate-500">No encrypted messages yet.</p> : null}
            </div>

            {selectedMessage ? (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-700">Decrypted Plaintext</p>
                {selectedMode === MESSAGING_SECURITY_MODE.PRIVATE ? <p className="mt-1 text-xs text-emerald-700">Private Mode content auto-clears after 45 seconds.</p> : null}
                <p className="mt-2 whitespace-pre-wrap text-sm text-emerald-950">{selectedMessage}</p>
              </div>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}
