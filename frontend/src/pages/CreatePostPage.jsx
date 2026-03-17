import { useState } from "react";
import PageHeader from "../components/PageHeader";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import { validatePostMediaSelection } from "../utils/validation";

export default function CreatePostPage() {
  const navigate = useNavigate();
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    if (!file) {
      setError("Attach exactly one media file");
      return;
    }

    const formData = new FormData();
    formData.append("caption", caption.trim());
    formData.append("file", file);
    setLoading(true);
    try {
      const { data } = await api.post("/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (data.moderationStatus === "PENDING_REVIEW") {
        setMessage(
          data.moderationDaoProposalId
            ? `Post sent to DAO review (proposal #${data.moderationDaoProposalId}).`
            : "Post sent to moderation review."
        );
      } else {
        setMessage(data.ipfsCid ? `Post created. CID: ${data.ipfsCid}` : "Thought posted successfully");
      }
      setCaption("");
      setFile(null);
      if (data.moderationStatus === "APPROVED") {
        navigate("/feed");
      }
    } catch (e2) {
      if (e2?.response?.status === 401 || e2?.response?.status === 403) {
        localStorage.removeItem("lulit_access_token");
        localStorage.removeItem("lulit_user");
        setError("Session expired. Please login again.");
        navigate("/login");
        return;
      }
      const serverData = e2?.response?.data;
      const serverMessage =
        typeof serverData === "string"
          ? serverData
          : serverData?.message || serverData?.error || e2?.message;
      const fallback = e2?.response?.status
        ? `Post creation failed (HTTP ${e2.response.status})`
        : "Post creation failed";
      setError(serverMessage || fallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Create Post" />
        <form onSubmit={submit} className="card grid gap-4 p-6">
          <label className="grid gap-1">
            <span className="text-sm font-semibold">Caption</span>
            <textarea
              className="rounded-xl border-slate-300"
              rows={4}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-semibold">Media File</span>
            <p className="text-xs text-slate-500">Required. Exactly one media file per post. Max 50MB.</p>
            <input
              type="file"
              accept="image/*,video/*"
              multiple={false}
              onChange={(e) => {
                const result = validatePostMediaSelection(e.target.files);
                if (!result.valid) {
                  setFile(null);
                  setError(result.message);
                  return;
                }
                setError("");
                setFile(result.file);
              }}
            />
          </label>
          <button className="rounded-xl bg-brand-500 py-2 font-semibold text-white" disabled={loading} type="submit">
            {loading ? "Publishing..." : "Publish"}
          </button>
          {message ? <p className="text-sm text-brand-700">{message}</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </form>
      </div>
    </main>
  );
}
