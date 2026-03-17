import { Formik } from "formik";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import * as Yup from "yup";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";

const schema = Yup.object({
  displayName: Yup.string().max(80),
  bio: Yup.string().max(280),
  location: Yup.string().max(100),
  websiteUrl: Yup.string().url("Must be a valid URL").nullable().transform((v) => (v === "" ? null : v)),
  about: Yup.string().max(1200),
  walletAddress: Yup.string().max(42),
  pinnedPostId: Yup.number().nullable().transform((v) => (Number.isNaN(v) ? null : v))
});

function Badge({ children }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{children}</span>;
}

function PostList({ posts }) {
  if (!posts?.length) {
    return <p className="text-sm text-slate-500">No posts here yet.</p>;
  }
  return (
    <div className="grid gap-3">
      {posts.map((post) => (
        <article key={post.id} className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-sm font-semibold text-slate-900">@{post.username}</p>
          {post.caption ? <p className="mt-1 text-sm text-slate-700">{post.caption}</p> : null}
          {post.mediaUrl ? (
            <img
              alt="Post media preview"
              className="mt-2 max-h-64 w-full rounded-lg border border-slate-200 object-contain"
              src={post.mediaUrl}
            />
          ) : null}
          <div className="mt-1 text-xs text-slate-500">Support: {post.supportCount || 0} | Challenge: {post.challengeCount || 0}</div>
        </article>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const params = useParams();
  const viewingUsername = params.username || user?.username;
  const isOwn = !params.username || params.username === user?.username;

  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("thoughts");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);

  const loadProfile = async () => {
    try {
      setError("");
      const { data } = isOwn
        ? await api.get("/profile/me")
        : await api.get(`/profile/${viewingUsername}`);
      setProfile(data);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load profile");
    }
  };

  useEffect(() => {
    loadProfile();
  }, [viewingUsername, isOwn]);

  const handleFollow = async () => {
    try {
      if (!profile) return;
      const endpoint = profile.following ? `/social/unfollow/${profile.username}` : `/social/follow/${profile.username}`;
      const { data } = await api.post(endpoint);
      setStatus(data.message || "Done");
      await loadProfile();
    } catch (e) {
      setError(e?.response?.data?.message || "Action failed");
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/profile/${profile?.username || viewingUsername}`;
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Profile link copied");
    } catch {
      setStatus(url);
    }
  };

  const pinnedPost = useMemo(() => {
    if (!profile?.pinnedPostId) return null;
    const combined = [...(profile.textPosts || []), ...(profile.mediaPosts || [])];
    return combined.find((p) => p.id === profile.pinnedPostId) || null;
  }, [profile]);

  if (!profile) {
    return (
      <main className="page-shell">
        <div className="mx-auto max-w-4xl">
          <PageHeader title="Profile" />
          <p className="text-sm">Loading profile...</p>
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Profile" />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-xl">
          <div
            className="h-44 w-full bg-gradient-to-r from-[#223a98] via-[#4967d8] to-[#ef4e82]"
            style={profile.coverUrl ? { backgroundImage: `url(${profile.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          />
          <div className="relative px-5 pb-5">
            <div className="absolute -top-10 left-5 h-20 w-20 overflow-hidden rounded-2xl border-4 border-white bg-slate-200">
              {profile.avatarUrl ? (
                <img alt="Profile avatar" className="h-full w-full object-cover" src={profile.avatarUrl} />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-bold text-slate-500">
                  {(profile.displayName || profile.username || "U").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            <div className="pt-12 text-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-2xl font-display font-bold text-slate-900">{profile.displayName || profile.username}</h2>
                  <p className="text-sm text-slate-600">@{profile.username}</p>
                </div>
                <div className="flex gap-2">
                  {isOwn ? (
                    <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={() => setShowEdit((v) => !v)} type="button">
                      {showEdit ? "Close Edit" : "Edit Profile"}
                    </button>
                  ) : (
                    <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={handleFollow} type="button">
                      {profile.following ? "Unfollow" : "Follow"}
                    </button>
                  )}
                  <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" onClick={handleShare} type="button">
                    Share
                  </button>
                  {isOwn ? (
                    <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" onClick={logout} type="button">
                      Logout
                    </button>
                  ) : null}
                </div>
              </div>

              {profile.bio ? <p className="mt-3 text-sm text-slate-700">{profile.bio}</p> : null}
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
                {profile.location ? <span>{profile.location}</span> : null}
                {profile.websiteUrl ? <a className="text-brand-700" href={profile.websiteUrl} rel="noreferrer" target="_blank">Website</a> : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {profile.walletConnected ? <Badge>Wallet Connected</Badge> : null}
                {profile.emailVerified ? <Badge>Email Verified</Badge> : null}
                {profile.daoParticipant ? <Badge>DAO Participant</Badge> : null}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-4">
                <div><p className="text-xs text-slate-500">Posts</p><p className="font-semibold text-slate-900">{profile.postsCount}</p></div>
                <div><p className="text-xs text-slate-500">Followers</p><p className="font-semibold text-slate-900">{profile.followersCount}</p></div>
                <div><p className="text-xs text-slate-500">Following</p><p className="font-semibold text-slate-900">{profile.followingCount}</p></div>
                <div><p className="text-xs text-slate-500">Reactions</p><p className="font-semibold text-slate-900">{profile.reactionsReceived}</p></div>
              </div>

              {profile.about ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">About</p>
                  <p className="mt-1 text-sm text-slate-700">{profile.about}</p>
                </div>
              ) : null}

              {pinnedPost ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Pinned Thought</p>
                  <p className="mt-1 text-sm text-slate-800">{pinnedPost.caption || "Media post"}</p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {showEdit && isOwn ? (
          <section className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-lg">
            <h3 className="font-display text-xl font-bold text-slate-900">Edit profile</h3>
            <Formik
              initialValues={{
                displayName: profile.displayName || "",
                bio: profile.bio || "",
                location: profile.location || "",
                websiteUrl: profile.websiteUrl || "",
                about: profile.about || "",
                walletAddress: profile.walletAddress || "",
                pinnedPostId: profile.pinnedPostId || ""
              }}
              enableReinitialize
              validationSchema={schema}
              onSubmit={async (values, { setSubmitting }) => {
                setError("");
                setStatus("");
                try {
                  await api.put("/profile/me", {
                    ...values,
                    pinnedPostId: values.pinnedPostId ? Number(values.pinnedPostId) : null
                  });
                  setStatus("Profile updated");
                  await loadProfile();
                } catch (e) {
                  setError(e?.response?.data?.message || "Update failed");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {({ values, errors, handleChange, handleSubmit, isSubmitting }) => (
                <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Avatar</p>
                      <input className="text-sm text-slate-900 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-slate-900" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} type="file" />
                      <button
                        className="mt-2 rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                        disabled={!avatarFile}
                        onClick={async (e) => {
                          e.preventDefault();
                          try {
                            const formData = new FormData();
                            formData.append("file", avatarFile);
                            await api.post("/profile/me/avatar", formData, { headers: { "Content-Type": "multipart/form-data" } });
                            setAvatarFile(null);
                            setStatus("Avatar updated");
                            await loadProfile();
                          } catch (err) {
                            setError(err?.response?.data?.message || "Avatar upload failed");
                          }
                        }}
                        type="button"
                      >
                        Upload Avatar
                      </button>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Cover</p>
                      <input className="text-sm text-slate-900 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-slate-900" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} type="file" />
                      <button
                        className="mt-2 rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                        disabled={!coverFile}
                        onClick={async (e) => {
                          e.preventDefault();
                          try {
                            const formData = new FormData();
                            formData.append("file", coverFile);
                            await api.post("/profile/me/cover", formData, { headers: { "Content-Type": "multipart/form-data" } });
                            setCoverFile(null);
                            setStatus("Cover updated");
                            await loadProfile();
                          } catch (err) {
                            setError(err?.response?.data?.message || "Cover upload failed");
                          }
                        }}
                        type="button"
                      >
                        Upload Cover
                      </button>
                    </div>
                  </div>
                  <input className="rounded-xl border-slate-300" name="displayName" onChange={handleChange} placeholder="Display name" value={values.displayName} />
                  <textarea className="rounded-xl border-slate-300" name="bio" onChange={handleChange} placeholder="Bio" rows={2} value={values.bio} />
                  <input className="rounded-xl border-slate-300" name="location" onChange={handleChange} placeholder="Location" value={values.location} />
                  <input className="rounded-xl border-slate-300" name="websiteUrl" onChange={handleChange} placeholder="Website URL" value={values.websiteUrl} />
                  <textarea className="rounded-xl border-slate-300" name="about" onChange={handleChange} placeholder="About" rows={4} value={values.about} />
                  <input className="rounded-xl border-slate-300" name="walletAddress" onChange={handleChange} placeholder="Wallet address (0x...)" value={values.walletAddress} />
                  <input className="rounded-xl border-slate-300" name="pinnedPostId" onChange={handleChange} placeholder="Pinned post id" value={values.pinnedPostId} />
                  {Object.values(errors).length ? <p className="text-sm text-red-700">{Object.values(errors)[0]}</p> : null}
                  <button className="rounded-xl bg-brand-500 py-2 font-semibold text-white" disabled={isSubmitting} type="submit">
                    {isSubmitting ? "Saving..." : "Save Profile"}
                  </button>
                </form>
              )}
            </Formik>
          </section>
        ) : null}

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-lg">
          <div className="mb-3 flex gap-2">
            <button className={`rounded-lg px-3 py-1 text-sm font-semibold ${tab === "thoughts" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`} onClick={() => setTab("thoughts")} type="button">Thoughts</button>
            <button className={`rounded-lg px-3 py-1 text-sm font-semibold ${tab === "media" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`} onClick={() => setTab("media")} type="button">Media</button>
            <button className={`rounded-lg px-3 py-1 text-sm font-semibold ${tab === "reacted" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`} onClick={() => setTab("reacted")} type="button">Validated</button>
          </div>
          {tab === "thoughts" ? <PostList posts={profile.textPosts} /> : null}
          {tab === "media" ? <PostList posts={profile.mediaPosts} /> : null}
          {tab === "reacted" ? <PostList posts={profile.reactedPosts} /> : null}
        </section>

        {status ? <p className="mt-3 text-sm text-emerald-700">{status}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        {profile.username !== user?.username ? <p className="mt-3 text-xs text-slate-500">Back to <Link className="text-brand-700 font-semibold" to="/profile">your profile</Link></p> : null}
      </div>
    </main>
  );
}
