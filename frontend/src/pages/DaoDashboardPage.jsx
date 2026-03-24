import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import api from "../services/api";
import { subscribeToDaoEvents } from "../services/daoChain";
import { useDaoWallet } from "../hooks/useDaoWallet";

const STATUS_CLASS = {
  PENDING: "bg-slate-500/20 text-slate-200",
  ACTIVE: "bg-emerald-500/20 text-emerald-200",
  PASSED: "bg-cyan-500/20 text-cyan-200",
  REJECTED: "bg-rose-500/20 text-rose-200"
};

function votePercent(forVotes, againstVotes, abstainVotes) {
  const total = Number(forVotes) + Number(againstVotes) + Number(abstainVotes);
  if (!total) return 0;
  return Math.round((Number(forVotes) / total) * 100);
}

export default function DaoDashboardPage() {
  const { wallet, stats, hydrating, connect } = useDaoWallet();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProposals = async () => {
    try {
      const { data } = await api.get("/dao/proposals/active");
      setProposals(data);
      setError("");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load DAO proposals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProposals();
    const id = setInterval(loadProposals, 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToDaoEvents(loadProposals);
    return () => unsubscribe();
  }, []);

  const handleConnect = async () => {
    try {
      setError("");
      await connect();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Wallet authentication failed");
    }
  };

  const sorted = useMemo(
    () => [...proposals].sort((a, b) => Number(b.id) - Number(a.id)),
    [proposals]
  );

  return (
    <main className="page-shell">
      <section className="mx-auto max-w-5xl">
        <PageHeader title="DAO Governance (Gasless)" />
        <div className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-white shadow-xl backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-300">Wallet-signature based governance. No gas fees for voting or proposal creation.</p>
            <div className="flex gap-2">
              <button
                className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
                onClick={handleConnect}
                type="button"
              >
                {wallet ? "Wallet Connected" : hydrating ? "Checking Wallet..." : "Connect Wallet"}
              </button>
              <Link className="rounded-xl border border-cyan-300/30 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20" to="/dao/create">
                Create Proposal
              </Link>
            </div>
          </div>
          {wallet ? <p className="mt-2 text-xs text-slate-400">Connected: {wallet}</p> : null}
          {stats ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-xs text-slate-400">Token Balance</p>
                <p className="text-lg font-semibold">{Number(stats.tokenBalance).toFixed(2)}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-xs text-slate-400">Reputation</p>
                <p className="text-lg font-semibold">{Number(stats.reputationScore).toFixed(2)}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-xs text-slate-400">Staking Weight</p>
                <p className="text-lg font-semibold">{Number(stats.stakingWeight).toFixed(2)}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-xs text-slate-400">Voting Power</p>
                <p className="text-lg font-semibold">{Number(stats.votingPower).toFixed(2)}</p>
              </div>
            </div>
          ) : null}
          {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        </div>

        {loading ? <p className="text-sm text-slate-700">Loading proposals...</p> : null}
        <div className="grid gap-4">
          {sorted.map((proposal) => {
            const progress = votePercent(proposal.forVotes, proposal.againstVotes, proposal.abstainVotes);
            const timeLeft = Math.max(0, proposal.endTime - Math.floor(Date.now() / 1000));
            return (
              <article key={proposal.id} className="rounded-2xl border border-slate-300/60 bg-white/70 p-4 shadow-lg backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">Proposal #{String(proposal.id)} - {proposal.title}</p>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[proposal.state] || STATUS_CLASS.PENDING}`}>{proposal.state}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{proposal.description}</p>
                <p className="mt-2 text-xs text-slate-500">Creator: {proposal.creatorWallet}</p>
                <p className="mt-1 text-xs text-slate-500">Strategy: {proposal.votingStrategy}</p>
                <p className="mt-1 text-xs text-slate-500">Type: {proposal.proposalType}</p>
                <p className="mt-1 text-xs text-slate-500">Time left: {timeLeft}s</p>
                <div className="mt-3 h-2 overflow-hidden rounded bg-slate-200">
                  <div className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-600 transition-all duration-700" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-2 flex gap-4 text-xs text-slate-700">
                  <span>For: {String(proposal.forVotes)}</span>
                  <span>Against: {String(proposal.againstVotes)}</span>
                  <span>Abstain: {String(proposal.abstainVotes)}</span>
                </div>
                <Link className="mt-3 inline-block text-sm font-semibold text-cyan-700 hover:text-cyan-900" to={`/dao/proposal/${proposal.id}`}>
                  View proposal
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
