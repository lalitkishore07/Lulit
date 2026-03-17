import { Formik } from "formik";
import { useState } from "react";
import * as Yup from "yup";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { DAO_PROPOSAL_TYPE, DAO_VOTING_STRATEGY, connectWallet, createProposalSigned, verifyWalletSession } from "../services/daoChain";

const schema = Yup.object({
  title: Yup.string().min(5).max(140).required("Title required"),
  description: Yup.string().min(20).max(5000).required("Description required"),
  proposalType: Yup.string().required("Proposal type required"),
  votingStrategy: Yup.string().required("Voting strategy required"),
  startTimeEpochSecond: Yup.number().required("Start time required"),
  endTimeEpochSecond: Yup.number().required("End time required").moreThan(Yup.ref("startTimeEpochSecond"), "End time must be greater than start time"),
  quorumBps: Yup.number().min(1).max(10000).required("Quorum BPS required")
});

export default function DaoCreateProposalPage() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const connect = async () => {
    setError("");
    try {
      const address = await connectWallet();
      await verifyWalletSession(address);
      setWallet(address);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Wallet verification failed");
    }
  };

  return (
    <main className="page-shell">
      <section className="mx-auto max-w-3xl">
        <PageHeader title="Create Gasless DAO Proposal" />
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-white shadow-xl backdrop-blur">
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="text-sm text-slate-300">Proposal creation is off-chain and signed with wallet message only.</p>
            <button className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400" onClick={connect} type="button">
              {wallet ? "Wallet Verified" : "Connect Wallet"}
            </button>
          </div>
          {wallet ? <p className="mb-4 text-xs text-slate-400">Wallet: {wallet}</p> : null}

          <Formik
            initialValues={{
              title: "",
              description: "",
              proposalType: DAO_PROPOSAL_TYPE.FEATURE_UPDATE,
              votingStrategy: DAO_VOTING_STRATEGY.ONE_WALLET_ONE_VOTE,
              startTimeEpochSecond: Math.floor(Date.now() / 1000),
              endTimeEpochSecond: Math.floor(Date.now() / 1000) + 86400,
              snapshotBlock: "",
              quorumBps: 2000
            }}
            validationSchema={schema}
            onSubmit={async (values, { setSubmitting }) => {
              setStatus("");
              setError("");
              try {
                if (!wallet) {
                  throw new Error("Connect wallet first");
                }

                const created = await createProposalSigned({
                  title: values.title,
                  description: values.description,
                  wallet,
                  proposalType: values.proposalType,
                  votingStrategy: values.votingStrategy,
                  startTimeEpochSecond: Number(values.startTimeEpochSecond),
                  endTimeEpochSecond: Number(values.endTimeEpochSecond),
                  snapshotBlock: values.snapshotBlock ? Number(values.snapshotBlock) : null,
                  quorumBps: Number(values.quorumBps)
                });

                setStatus(`Proposal #${created.id} created`);
                navigate("/dao");
              } catch (e) {
                setError(e?.response?.data?.message || e?.message || "Failed to create proposal");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ values, errors, touched, handleChange, handleSubmit, isSubmitting }) => (
              <form className="grid gap-4" onSubmit={handleSubmit}>
                <div className="grid gap-1">
                  <label className="text-sm font-semibold">Title</label>
                  <input className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2" name="title" onChange={handleChange} value={values.title} />
                  {touched.title && errors.title ? <p className="text-xs text-rose-300">{errors.title}</p> : null}
                </div>
                <div className="grid gap-1">
                  <label className="text-sm font-semibold">Description</label>
                  <textarea className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2" name="description" onChange={handleChange} rows={5} value={values.description} />
                </div>
                <div className="grid gap-1 sm:grid-cols-2 sm:gap-3">
                  <div className="grid gap-1">
                    <label className="text-sm font-semibold">Proposal Type</label>
                    <select className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2" name="proposalType" onChange={handleChange} value={values.proposalType}>
                      <option value={DAO_PROPOSAL_TYPE.FEATURE_UPDATE}>Feature Update</option>
                      <option value={DAO_PROPOSAL_TYPE.CONTENT_MODERATION}>Content Moderation</option>
                      <option value={DAO_PROPOSAL_TYPE.TREASURY_SPENDING}>Treasury Spending</option>
                      <option value={DAO_PROPOSAL_TYPE.ADMIN_ELECTION}>Admin Election</option>
                    </select>
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm font-semibold">Voting Strategy</label>
                    <select className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2" name="votingStrategy" onChange={handleChange} value={values.votingStrategy}>
                      <option value={DAO_VOTING_STRATEGY.ONE_WALLET_ONE_VOTE}>1 wallet 1 vote</option>
                      <option value={DAO_VOTING_STRATEGY.TOKEN_WEIGHTED}>Token weighted</option>
                      <option value={DAO_VOTING_STRATEGY.REPUTATION_BASED}>Reputation based</option>
                      <option value={DAO_VOTING_STRATEGY.QUADRATIC}>Quadratic</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-1 sm:grid-cols-2 sm:gap-3">
                  <div className="grid gap-1">
                    <label className="text-sm font-semibold">Start Time (epoch sec)</label>
                    <input className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2" name="startTimeEpochSecond" onChange={handleChange} value={values.startTimeEpochSecond} />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm font-semibold">End Time (epoch sec)</label>
                    <input className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2" name="endTimeEpochSecond" onChange={handleChange} value={values.endTimeEpochSecond} />
                  </div>
                </div>
                <div className="grid gap-1 sm:grid-cols-2 sm:gap-3">
                  <div className="grid gap-1">
                    <label className="text-sm font-semibold">Snapshot Block (optional)</label>
                    <input className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2" name="snapshotBlock" onChange={handleChange} value={values.snapshotBlock} />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm font-semibold">Quorum BPS</label>
                    <input className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2" name="quorumBps" onChange={handleChange} value={values.quorumBps} />
                  </div>
                </div>
                <button className="rounded-xl bg-emerald-500 py-2 font-semibold text-white hover:bg-emerald-400" disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Signing..." : "Create Proposal"}
                </button>
                {status ? <p className="text-sm text-emerald-300">{status}</p> : null}
                {error ? <p className="text-sm text-rose-300">{error}</p> : null}
              </form>
            )}
          </Formik>
        </div>
      </section>
    </main>
  );
}
