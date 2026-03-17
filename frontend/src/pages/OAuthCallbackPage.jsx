import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function OAuthCallbackPage() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("accessToken");
    const userId = params.get("userId");
    const username = params.get("username");
    const oauthError = params.get("error");

    if (oauthError) {
      setError(oauthError);
      return;
    }

    if (!accessToken || !userId || !username) {
      setError("Missing OAuth login data");
      return;
    }

    loginWithToken({ accessToken, userId, username });
    navigate("/feed", { replace: true });
  }, [loginWithToken, navigate]);

  return (
    <main className="auth-shell">
      <div className="mx-auto max-w-md auth-card p-7 sm:p-8 text-white">
        <h1 className="auth-title">{error ? "OAuth Login Failed" : "Signing you in..."}</h1>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : <p className="mt-3 text-sm text-slate-200">Please wait while we complete login.</p>}
      </div>
    </main>
  );
}
