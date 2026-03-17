import PageHeader from "../components/PageHeader";
import WalletConnect from "../components/WalletConnect";
import { useAuth } from "../hooks/useAuth";

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
      </div>
    </main>
  );
}
