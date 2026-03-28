import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import api from "../services/api";
import { loadPreferences } from "../utils/preferences";

function formatPostDateTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(parsed);
}

function MediaPreview({ post, onExpand }) {
  if (!post.mediaUrl) {
    return <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Text thought</p>;
  }

  if (post.mediaMimeType?.startsWith("image/")) {
    return (
      <button className="mt-3 block w-full" onClick={() => onExpand(post.mediaUrl)} type="button">
        <img
          alt="Post media"
          className="feed-media max-h-[34rem] w-full rounded-xl border border-slate-200 bg-slate-100 object-contain"
          loading="lazy"
          src={post.mediaUrl}
        />
      </button>
    );
  }

  if (post.mediaMimeType?.startsWith("video/")) {
    return <video className="feed-media mt-3 max-h-[34rem] w-full rounded-xl border border-slate-200 bg-black object-contain" controls src={post.mediaUrl} />;
  }

  return (
    <a className="mt-3 inline-block text-sm font-semibold text-brand-700" href={post.mediaUrl} rel="noreferrer" target="_blank">
      Open IPFS Media
    </a>
  );
}

export default function FeedPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [accountQuery, setAccountQuery] = useState("");
  const [accountResults, setAccountResults] = useState([]);
  const [searchingAccounts, setSearchingAccounts] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedImage, setExpandedImage] = useState("");

  const fetchFeed = async (mounted = true) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/posts/feed");
      if (mounted) {
        setPosts(res.data);
      }
    } catch (e) {
      if (mounted) {
        setError(e?.response?.data?.message || "Failed to fetch feed");
      }
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    fetchFeed(mounted);
    return () => {
      mounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    const prefs = loadPreferences();
    if (!prefs.autoRefreshFeed) return undefined;
    const timer = window.setInterval(() => fetchFeed(true), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const refreshFeed = () => fetchFeed(true);

  const searchAccounts = async (query) => {
    const normalized = query.trim();
    if (!normalized) {
      setAccountResults([]);
      return;
    }

    setSearchingAccounts(true);
    try {
      const { data } = await api.get("/profile/search/accounts", {
        params: { q: normalized }
      });
      setAccountResults(data || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to search accounts");
    } finally {
      setSearchingAccounts(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      searchAccounts(accountQuery);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [accountQuery]);

  const validatePost = async (postId, choice) => {
    try {
      const { data } = await api.post(`/posts/${postId}/validate`, { choice });
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? { ...post, myValidation: data.myValidation, supportCount: data.supportCount, challengeCount: data.challengeCount }
            : post
        )
      );
    } catch (e) {
      setError(e?.response?.data?.message || "Unable to validate this post");
    }
  };

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Feed" />
        <div className="mb-4">
          <div className="card mb-3 p-3">
            <label className="feed-meta mb-2 block text-xs font-semibold uppercase tracking-wide" htmlFor="account-search">
              Search Accounts
            </label>
            <input
              id="account-search"
              className="w-full rounded-xl border px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none"
              onChange={(event) => setAccountQuery(event.target.value)}
              placeholder="Type username or display name"
              style={{
                borderColor: "var(--card-border)",
                background: "var(--nav-bg)",
                color: "var(--text-strong)"
              }}
              value={accountQuery}
            />
            {searchingAccounts ? <p className="feed-meta mt-2 text-xs">Searching accounts...</p> : null}
            {accountQuery.trim() && !searchingAccounts && accountResults.length === 0 ? (
              <p className="feed-meta mt-2 text-xs">No matching accounts</p>
            ) : null}
            {accountResults.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {accountResults.map((account) => (
                  <Link
                    className="flex items-center justify-between rounded-xl border px-3 py-2 transition hover:-translate-y-[1px]"
                    key={account.username}
                    style={{
                      borderColor: "var(--card-border)",
                      background: "var(--nav-bg)"
                    }}
                    to={`/profile/${account.username}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-9 w-9 overflow-hidden rounded-full border border-slate-200 bg-slate-200">
                        {account.avatarUrl ? (
                          <img alt={`${account.username} avatar`} className="h-full w-full object-cover" src={account.avatarUrl} />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold feed-user">
                          {account.displayName || account.username}
                        </p>
                        <p className="feed-meta truncate text-xs">@{account.username}</p>
                      </div>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{
                        background: "var(--chip-bg)",
                        color: "var(--chip-text)",
                        border: "1px solid var(--chip-border)"
                      }}
                    >
                      {account.friend ? "Friends" : account.following ? "Request Sent" : "View"}
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          <button
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            onClick={refreshFeed}
            type="button"
          >
            {loading ? "Refreshing..." : "Refresh feed"}
          </button>
        </div>
        {loading ? <p className="text-sm">Loading feed...</p> : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="grid gap-4">
          {posts.map((post) => (
            <article key={post.id} className="card p-4">
              <p className="feed-user">@{post.username}</p>
              {post.caption ? <p className="feed-caption">{post.caption}</p> : null}
              <MediaPreview onExpand={setExpandedImage} post={post} />
              {post.createdAt ? <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">{formatPostDateTime(post.createdAt)}</p> : null}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    className={`rounded-lg px-3 py-1 text-sm font-semibold transition ${post.myValidation === "SUPPORT" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    onClick={() => validatePost(post.id, "SUPPORT")}
                    type="button"
                  >
                    Support {post.supportCount ? `(${post.supportCount})` : ""}
                  </button>
                  <button
                    className={`rounded-lg px-3 py-1 text-sm font-semibold transition ${post.myValidation === "CHALLENGE" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    onClick={() => validatePost(post.id, "CHALLENGE")}
                    type="button"
                  >
                    Challenge {post.challengeCount ? `(${post.challengeCount})` : ""}
                  </button>
                </div>
                {post.blockchainTxHash ? <p className="feed-meta">TX: {post.blockchainTxHash}</p> : null}
              </div>
            </article>
          ))}
        </div>
      </div>
      {expandedImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setExpandedImage("")}
          role="presentation"
        >
          <img
            alt="Expanded post media"
            className="max-h-[90vh] max-w-[92vw] rounded-xl object-contain"
            src={expandedImage}
          />
        </div>
      ) : null}
    </main>
  );
}
