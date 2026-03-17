import { useState } from "react";
import { Form, Formik } from "formik";
import api from "../services/api";
import {
  aadhaarSchema,
  credentialsSchema,
  emailSchema,
  otpSchema,
  phoneSchema
} from "../utils/validation";
import { Link, useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";

function Input({ label, ...props }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-semibold">{label}</span>
      <input className="rounded-xl border-slate-300" {...props} />
    </label>
  );
}

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otpStatus, setOtpStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const withRequest = async (fn) => {
    setError("");
    setOtpStatus("");
    setLoading(true);
    try {
      await fn();
    } catch (e) {
      setError(e?.response?.data?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <span className="auth-beam left-[-24rem] top-[20%]" aria-hidden="true" />
      <span className="auth-beam auth-beam-2 right-[-20rem] top-[62%]" aria-hidden="true" />
      <span className="auth-beam auth-beam-3 left-[-16rem] top-[76%]" aria-hidden="true" />
      <span className="auth-orb left-[-6rem] top-[8%]" aria-hidden="true" />
      <span className="auth-orb auth-orb-2 right-[-5rem] bottom-[8%]" aria-hidden="true" />
      <span className="auth-orb auth-orb-3 left-[40%] bottom-[-5rem]" aria-hidden="true" />
      <span className="auth-ring left-[-7rem] top-[18%]" aria-hidden="true" />
      <span className="auth-ring auth-ring-2 right-[-2rem] bottom-[14%]" aria-hidden="true" />
      <span className="auth-sparkline left-[-5rem] top-[28%]" aria-hidden="true" />
      <span className="auth-sparkline auth-sparkline-2 left-[-7rem] top-[66%]" aria-hidden="true" />
      <span className="auth-hex left-[8%] top-[22%]" aria-hidden="true" />
      <span className="auth-hex auth-hex-2 right-[10%] top-[72%]" aria-hidden="true" />
      <span className="auth-particle auth-p1" aria-hidden="true" />
      <span className="auth-particle auth-p2" aria-hidden="true" />
      <span className="auth-particle auth-p3" aria-hidden="true" />
      <span className="auth-particle auth-p4" aria-hidden="true" />
      <span className="auth-particle auth-p5" aria-hidden="true" />
      <span className="auth-particle auth-p6" aria-hidden="true" />
      <div className="mx-auto w-full max-w-xl auth-card p-6 sm:p-8">
        <div className="mb-3 flex justify-center">
          <BrandLogo to="/" className="px-4 py-3" imageClassName="h-12 w-12 sm:h-14 sm:w-14" />
        </div>
        <h1 className="auth-title">Create your Lulit account</h1>
        <p className="mt-2 text-sm text-slate-300">Step {step} of 4</p>

        {step === 1 && (
          <Formik
            initialValues={{ email, otp: "" }}
            validationSchema={email ? otpSchema : emailSchema}
            onSubmit={async (values) => {
              if (!email) {
                await withRequest(async () => {
                  await api.post("/auth/signup/email/request", { email: values.email });
                  setEmail(values.email);
                  setOtpStatus("OTP sent to email");
                });
                return;
              }
              await withRequest(async () => {
                await api.post("/auth/signup/email/verify", { email, otp: values.otp });
                setStep(2);
              });
            }}
          >
            {({ values, errors, touched, handleChange }) => (
              <Form className="mt-5 grid gap-4">
                {!email ? (
                  <Input name="email" type="email" label="Gmail" value={values.email} onChange={handleChange} />
                ) : (
                  <Input name="otp" label="Email OTP" value={values.otp} onChange={handleChange} />
                )}
                {Object.keys(errors).map((k) => (touched[k] ? <p key={k} className="text-sm text-red-600">{errors[k]}</p> : null))}
                <button className="auth-submit" type="submit" disabled={loading}>
                  {loading ? "Please wait..." : email ? "Verify Email OTP" : "Send Email OTP"}
                </button>
              </Form>
            )}
          </Formik>
        )}

        {step === 2 && (
          <Formik
            initialValues={{ countryCode: "+91", phoneNumber: "", otp: "" }}
            validationSchema={otpStatus ? otpSchema : phoneSchema}
            onSubmit={async (values) => {
              if (!otpStatus) {
                await withRequest(async () => {
                  await api.post("/auth/signup/phone/request", {
                    email,
                    countryCode: values.countryCode,
                    phoneNumber: values.phoneNumber
                  });
                  setOtpStatus("OTP sent to phone");
                });
                return;
              }
              await withRequest(async () => {
                await api.post("/auth/signup/phone/verify", { email, otp: values.otp });
                setOtpStatus("");
                setStep(3);
              });
            }}
          >
            {({ values, errors, touched, handleChange }) => (
              <Form className="mt-5 grid gap-4">
                {!otpStatus ? (
                  <>
                    <Input name="countryCode" label="Country Code" value={values.countryCode} onChange={handleChange} />
                    <Input name="phoneNumber" label="Phone Number" value={values.phoneNumber} onChange={handleChange} />
                  </>
                ) : (
                  <Input name="otp" label="Phone OTP" value={values.otp} onChange={handleChange} />
                )}
                {Object.keys(errors).map((k) => (touched[k] ? <p key={k} className="text-sm text-red-600">{errors[k]}</p> : null))}
                <button className="auth-submit" type="submit" disabled={loading}>
                  {loading ? "Please wait..." : otpStatus ? "Verify Phone OTP" : "Send Phone OTP"}
                </button>
              </Form>
            )}
          </Formik>
        )}

        {step === 3 && (
          <Formik
            initialValues={{ aadhaarNumber: "" }}
            validationSchema={aadhaarSchema}
            onSubmit={async (values) => {
              await withRequest(async () => {
                await api.post("/auth/signup/aadhaar/verify", { email, aadhaarNumber: values.aadhaarNumber });
                setStep(4);
              });
            }}
          >
            {({ values, errors, touched, handleChange }) => (
              <Form className="mt-5 grid gap-4">
                <Input name="aadhaarNumber" label="Aadhaar Number" value={values.aadhaarNumber} onChange={handleChange} />
                {touched.aadhaarNumber && errors.aadhaarNumber ? (
                  <p className="text-sm text-red-600">{errors.aadhaarNumber}</p>
                ) : null}
                <p className="text-xs text-slate-600">
                  We store only Aadhaar last 4 digits and encrypted SHA-256 hash.
                </p>
                <button className="auth-submit" type="submit" disabled={loading}>
                  {loading ? "Please wait..." : "Verify Aadhaar"}
                </button>
              </Form>
            )}
          </Formik>
        )}

        {step === 4 && (
          <Formik
            initialValues={{ username: "", password: "" }}
            validationSchema={credentialsSchema}
            onSubmit={async (values) => {
              await withRequest(async () => {
                await api.post("/auth/signup/complete", { email, ...values });
                navigate("/login");
              });
            }}
          >
            {({ values, errors, touched, handleChange }) => (
              <Form className="mt-5 grid gap-4">
                <Input name="username" label="Username" value={values.username} onChange={handleChange} />
                <Input name="password" type="password" label="Password" value={values.password} onChange={handleChange} />
                {Object.keys(errors).map((k) => (touched[k] ? <p key={k} className="text-sm text-red-600">{errors[k]}</p> : null))}
                <button className="auth-submit" type="submit" disabled={loading}>
                  {loading ? "Please wait..." : "Create Account"}
                </button>
              </Form>
            )}
          </Formik>
        )}

        {otpStatus ? <p className="mt-4 text-sm text-cyan-300">{otpStatus}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        <p className="mt-5 text-sm text-slate-200">
          Have an account? <Link className="font-semibold text-brand-700" to="/login">Login</Link>
        </p>
      </div>
    </main>
  );
}
