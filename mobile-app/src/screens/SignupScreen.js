import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import api from "../services/api";
import BrandLogo from "../components/BrandLogo";
import ScreenShell from "../components/ScreenShell";
import SurfaceCard from "../components/SurfaceCard";
import { palette } from "../theme";

function Input({ value, onChangeText, placeholder, secureTextEntry = false }) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#94a3b8"
      secureTextEntry={secureTextEntry}
      autoCapitalize="none"
    />
  );
}

export default function SignupScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const [email, setEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const run = async (fn) => {
    setLoading(true);
    setError("");
    setStatus("");
    try {
      await fn();
    } catch (e) {
      setError(e?.response?.data?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell
      eyebrow="Trusted Onboarding"
      title="Create your Lulit identity"
      subtitle="Verify email, phone, and identity, then unlock the full social + DAO experience."
      scroll
      bodyStyle={styles.body}
    >
      <SurfaceCard style={styles.card}>
        <BrandLogo style={styles.logo} />
        <View style={styles.progressRow}>
          {[1, 2, 3, 4].map((item) => (
            <View key={item} style={[styles.progressDot, step >= item && styles.progressDotActive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>Step {step} of 4</Text>

        {step === 1 ? (
          <>
            <Input value={email} onChangeText={setEmail} placeholder="Email" />
            <Input value={emailOtp} onChangeText={setEmailOtp} placeholder="Email OTP" />
            <View style={styles.row}>
              <Pressable
                style={[styles.btn, styles.btnAlt]}
                onPress={() =>
                  run(async () => {
                    await api.post("/auth/signup/email/request", { email });
                    setStatus("Email OTP sent");
                  })
                }
              >
                {loading ? <ActivityIndicator color={palette.blue} /> : <Text style={styles.btnAltText}>Send OTP</Text>}
              </Pressable>
              <Pressable
                style={styles.btn}
                onPress={() =>
                  run(async () => {
                    await api.post("/auth/signup/email/verify", { email, otp: emailOtp });
                    setStep(2);
                  })
                }
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify</Text>}
              </Pressable>
            </View>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Input value={countryCode} onChangeText={setCountryCode} placeholder="Country Code (+91)" />
            <Input value={phoneNumber} onChangeText={setPhoneNumber} placeholder="Phone Number" />
            <Input value={phoneOtp} onChangeText={setPhoneOtp} placeholder="Phone OTP" />
            <View style={styles.row}>
              <Pressable
                style={[styles.btn, styles.btnAlt]}
                onPress={() =>
                  run(async () => {
                    await api.post("/auth/signup/phone/request", {
                      email,
                      countryCode,
                      phoneNumber
                    });
                    setStatus("Phone OTP sent");
                  })
                }
              >
                {loading ? <ActivityIndicator color={palette.blue} /> : <Text style={styles.btnAltText}>Send OTP</Text>}
              </Pressable>
              <Pressable
                style={styles.btn}
                onPress={() =>
                  run(async () => {
                    await api.post("/auth/signup/phone/verify", { email, otp: phoneOtp });
                    setStep(3);
                  })
                }
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify</Text>}
              </Pressable>
            </View>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Input value={aadhaarNumber} onChangeText={setAadhaarNumber} placeholder="Aadhaar Number" />
            <Pressable
              style={styles.btn}
              onPress={() =>
                run(async () => {
                  await api.post("/auth/signup/aadhaar/verify", { email, aadhaarNumber });
                  setStep(4);
                })
              }
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify Aadhaar</Text>}
            </Pressable>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <Input value={username} onChangeText={setUsername} placeholder="Username" />
            <Input value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
            <Pressable
              style={styles.btn}
              onPress={() =>
                run(async () => {
                  await api.post("/auth/signup/complete", { email, username, password });
                  setStatus("Account created. Please login.");
                  navigation.navigate("Login");
                })
              }
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
            </Pressable>
          </>
        ) : null}

        {status ? <Text style={styles.success}>{status}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable onPress={() => navigation.navigate("Login")} style={styles.linkWrap}>
          <Text style={styles.link}>Already have an account? Login</Text>
        </Pressable>
      </SurfaceCard>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingBottom: 32
  },
  card: {
    gap: 12
  },
  logo: {
    marginBottom: 2
  },
  progressRow: {
    flexDirection: "row",
    gap: 8
  },
  progressDot: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#dbe6f5"
  },
  progressDotActive: {
    backgroundColor: palette.cyan
  },
  stepLabel: {
    color: palette.slate,
    fontWeight: "700"
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccd8e8",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: palette.ink,
    backgroundColor: "#f7faff"
  },
  row: {
    flexDirection: "row",
    gap: 8
  },
  btn: {
    flex: 1,
    backgroundColor: palette.navy,
    borderRadius: 16,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center"
  },
  btnAlt: {
    backgroundColor: "#f7faff",
    borderWidth: 1,
    borderColor: "#ccd8e8"
  },
  btnText: {
    color: "#fff",
    fontWeight: "800"
  },
  btnAltText: {
    color: palette.ink,
    fontWeight: "800"
  },
  success: {
    color: palette.mint,
    fontWeight: "700"
  },
  error: {
    color: palette.coral,
    fontWeight: "700"
  },
  linkWrap: {
    paddingTop: 4
  },
  link: {
    color: palette.blue,
    fontWeight: "700"
  }
});
