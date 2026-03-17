import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import api from "../services/api";
import { castVoteSigned, connectWallet, fetchWalletGovernanceStats, subscribeToDaoEvents, verifyWalletSession } from "../services/daoChain";

export default function DaoProposalDetailPage() {
  const { id } = useParams();
  const [proposal, setProposal] = useState(null);
  const [results, setResults] = useState(null);
  const [wallet, setWallet] = useState("");
  const [walletStats, setWalletStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const load = async () => {
    setError("");
    try {
      const [{ data: p }, { data: r }] = await Promise.all([
        api.get(`/dao/proposals/${id}`),
        api.get(`/dao/proposals/${id}/results`)
      ]);
      setProposal(p);
      setResults(r);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load proposal");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 12000);
    const unsubscribe = subscribeToDaoEvents(load);
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, [id]);

  const connect = async () => {
    try {
      const address = await connectWallet();
      await verifyWalletSession(address);
      setWallet(address);
      setWalletStats(await fetchWalletGovernanceStats(address));
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Wallet connection failed");
    }
  };

  const vote = async (choice) => {
    setError("");
    setStatus("");
    try {
      if (!wallet) {
        throw new Error("Connect wallet first");
      }
      await castVoteSigned(Number(id), wallet, choice);
      setStatus("Vote submitted successfully");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Vote failed");
    }
  };

  if (loading) {
    return (
      <main className="page-shell">
        <section className="mx-auto max-w-3xl">
          <PageHeader title="Proposal Detail" />
          <p className="text-sm">Loading proposal...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="mx-auto max-w-3xl">
        <PageHeader title={`DAO Proposal #${id}`} />
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-white shadow-xl backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-300">Status: <span className="font-semibold text-white">{proposal?.state}</span></p>
            <button className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400" onClick={connect} type="button">
              {wallet ? "Wallet Verified" : "Connect Wallet"}
            </button>
          </div>

          <div className="mt-4 grid gap-2 text-sm">
            <p><span className="text-slate-400">Title:</span> {proposal?.title}</p>
            <p><span className="text-slate-400">Description:</span> {proposal?.description}</p>
            <p><span className="text-slate-400">Creator:</span> {proposal?.creatorWallet}</p>
            <p><span className="text-slate-400">Type:</span> {proposal?.proposalType}</p>
            <p><span className="text-slate-400">Strategy:</span> {proposal?.votingStrategy}</p>
            <p><span className="text-slate-400">Metadata:</span> {proposal?.metadataUrl}</p>
            <p><span className="text-slate-400">Votes for:</span> {String(proposal?.forVotes || 0)}</p>
            <p><span className="text-slate-400">Votes against:</span> {String(proposal?.againstVotes || 0)}</p>
            <p><span className="text-slate-400">Votes abstain:</span> {String(proposal?.abstainVotes || 0)}</p>
          </div>

          {walletStats ? (
            <p className="mt-3 text-xs text-emerald-300">Your estimated voting power: {Number(walletStats.votingPower).toFixed(2)}</p>
          ) : null}

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-400" onClick={() => vote("FOR")} type="button">
              Vote For
            </button>
            <button className="rounded-xl bg-rose-500 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-400" onClick={() => vote("AGAINST")} type="button">
              Vote Against
            </button>
            <button className="rounded-xl bg-slate-500 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-400" onClick={() => vote("ABSTAIN")} type="button">
              Abstain
            </button>
          </div>

          {results ? (
            <p className="mt-4 text-xs text-slate-300">
              Quorum required: {String(results.quorumRequired)} | Total cast: {String(results.totalVotes)}
            </p>
          ) : null}
          {status ? <p className="mt-2 text-sm text-emerald-300">{status}</p> : null}
          {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
        </div>
      </section>
    </main>
  );
}
