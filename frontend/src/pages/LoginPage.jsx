import { Form, Formik } from "formik";
import * as Yup from "yup";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useState } from "react";
import BrandLogo from "../components/BrandLogo";
import { getBackendOrigin } from "../services/runtimeConfig";

const schema = Yup.object({
  username: Yup.string().required("Username is required"),
  password: Yup.string().required("Password is required")
});

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const backendOrigin = getBackendOrigin();

  const startOAuthLogin = (provider) => {
    window.location.href = `${backendOrigin}/oauth2/authorization/${provider}`;
  };

  return (
    <main className="auth-shell">
      <span className="auth-beam left-[-20rem] top-[24%]" aria-hidden="true" />
      <span className="auth-beam auth-beam-2 right-[-22rem] top-[56%]" aria-hidden="true" />
      <span className="auth-beam auth-beam-3 left-[-18rem] top-[72%]" aria-hidden="true" />
      <span className="auth-orb left-[-6rem] top-[8%]" aria-hidden="true" />
      <span className="auth-orb auth-orb-2 right-[-5rem] bottom-[6%]" aria-hidden="true" />
      <span className="auth-orb auth-orb-3 left-[34%] bottom-[-4rem]" aria-hidden="true" />
      <span className="auth-ring left-[-6rem] top-[20%]" aria-hidden="true" />
      <span className="auth-ring auth-ring-2 right-[-2rem] bottom-[16%]" aria-hidden="true" />
      <span className="auth-sparkline left-[-4rem] top-[30%]" aria-hidden="true" />
      <span className="auth-sparkline auth-sparkline-2 left-[-8rem] top-[62%]" aria-hidden="true" />
      <span className="auth-hex left-[9%] top-[26%]" aria-hidden="true" />
      <span className="auth-hex auth-hex-2 right-[11%] top-[70%]" aria-hidden="true" />
      <span className="auth-particle auth-p1" aria-hidden="true" />
      <span className="auth-particle auth-p2" aria-hidden="true" />
      <span className="auth-particle auth-p3" aria-hidden="true" />
      <span className="auth-particle auth-p4" aria-hidden="true" />
      <span className="auth-particle auth-p5" aria-hidden="true" />
      <span className="auth-particle auth-p6" aria-hidden="true" />
      <div className="mx-auto max-w-md auth-card p-7 sm:p-8">
        <div className="mb-3 flex justify-center">
          <BrandLogo to="/" className="px-4 py-3" imageClassName="h-12 w-12 sm:h-14 sm:w-14" />
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <Formik
          initialValues={{ username: "", password: "" }}
          validationSchema={schema}
          onSubmit={async (values) => {
            setError("");
            setLoading(true);
            try {
              await login(values);
              navigate("/dashboard");
            } catch (e) {
              setError(e?.response?.data?.message || "Login failed");
            } finally {
              setLoading(false);
            }
          }}
        >
          {({ values, errors, touched, handleChange }) => (
            <Form className="mt-5 grid gap-4">
              <label className="grid gap-1">
                <span className="text-sm font-semibold">Username</span>
                <input className="rounded-xl border-slate-300" name="username" value={values.username} onChange={handleChange} />
              </label>
              {touched.username && errors.username ? <p className="text-sm text-red-600">{errors.username}</p> : null}
              <label className="grid gap-1">
                <span className="text-sm font-semibold">Password</span>
                <input className="rounded-xl border-slate-300" type="password" name="password" value={values.password} onChange={handleChange} />
              </label>
              {touched.password && errors.password ? <p className="text-sm text-red-600">{errors.password}</p> : null}
              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Login"}
              </button>
            </Form>
          )}
        </Formik>
        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-600/60" />
          <span className="text-xs uppercase tracking-wide text-slate-300">or continue with</span>
          <span className="h-px flex-1 bg-slate-600/60" />
        </div>
        <div className="grid gap-2">
          <button
            className="rounded-xl border border-slate-500/70 bg-slate-900/55 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800/70"
            onClick={() => startOAuthLogin("google")}
            type="button"
          >
            Continue with Google
          </button>
          <button
            className="rounded-xl border border-slate-500/70 bg-slate-900/55 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800/70"
            onClick={() => startOAuthLogin("github")}
            type="button"
          >
            Continue with GitHub
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        <p className="mt-4 text-sm text-slate-200">
          Need an account? <Link to="/signup" className="font-semibold text-brand-700">Create one</Link>
        </p>
      </div>
    </main>
  );
}
