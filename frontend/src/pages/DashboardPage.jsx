import PageHeader from "../components/PageHeader";
import WalletConnect from "../components/WalletConnect";
import { useAuth } from "../hooks/useAuth";
import { Link } from "react-router-dom";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Dashboard" />
        <section className="grid gap-4 sm:grid-cols-2">
          <article className="card p-5">
            <h2 className="font-display text-xl">Account</h2>
            <p className="mt-2 text-sm text-slate-700">Signed in as @{user?.username}</p>
          </article>
          <WalletConnect />
        </section>
        <section className="mt-5 grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
          <article className="message-spotlight p-6">
            <div className="message-spotlight-grid" aria-hidden="true">
              <span className="message-spotlight-orb message-spotlight-orb-a" />
              <span className="message-spotlight-orb message-spotlight-orb-b" />
            </div>
            <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="message-spotlight-kicker">Secure Messaging</p>
                <h2 className="font-display text-2xl sm:text-3xl text-white">Private conversations with wallet-auth identity and encrypted IPFS delivery.</h2>
                <p className="mt-3 max-w-xl text-sm text-slate-200">
                  Send zero-plaintext messages with MetaMask authentication, libsodium end-to-end encryption, and a stronger
                  `Private Mode` for highly sensitive chats or media.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-100/90">
                  <span className="message-spotlight-chip">E2EE on device</span>
                  <span className="message-spotlight-chip">Wallet identity</span>
                  <span className="message-spotlight-chip">Pinata + IPFS</span>
                  <span className="message-spotlight-chip">Private Mode</span>
                </div>
              </div>
              <div className="relative z-10 flex flex-col items-stretch gap-3">
                <Link className="message-spotlight-action" to="/messages">
                  Open Secure Messages
                </Link>
                <p className="text-xs text-slate-200/80">Best for direct, sensitive, or high-trust communication.</p>
              </div>
            </div>
          </article>
          <article className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Why It Matters</p>
            <div className="mt-4 grid gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Standard Secure</p>
                <p className="mt-1 text-sm text-slate-600">Fast encrypted messaging for everyday conversations.</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Private Mode</p>
                <p className="mt-1 text-sm text-slate-600">Fresh wallet auth, reduced inbox metadata, and short-lived plaintext view.</p>
              </div>
              <div className="rounded-xl bg-slate-900/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Quick Tip</p>
                <p className="mt-2 text-sm text-slate-700">Ask both wallets to open the Messages page once so their secure messaging identity and prekeys are registered.</p>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
