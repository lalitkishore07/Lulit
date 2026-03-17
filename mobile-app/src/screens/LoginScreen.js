import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import BrandLogo from "../components/BrandLogo";
import ScreenShell from "../components/ScreenShell";
import SurfaceCard from "../components/SurfaceCard";
import { palette } from "../theme";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onLogin = async () => {
    if (!username || !password) {
      setError("Username/email and password are required");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login({ username, password });
    } catch (e) {
      setError(e?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenShell
        eyebrow="Community Network"
        title="Lulit mobile"
        subtitle="Live feed, verified identity, and DAO governance in one sharper mobile flow."
        contentStyle={styles.shellContent}
      >
        <SurfaceCard style={styles.card}>
          <BrandLogo style={styles.logo} />
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Social + DAO</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Sign in to continue</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholder="Username or email"
            placeholderTextColor="#7c8aa5"
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Password"
            placeholderTextColor="#7c8aa5"
            style={styles.input}
          />
          <Pressable style={[styles.button, loading && styles.disabled]} onPress={onLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enter Lulit</Text>}
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable onPress={() => navigation.navigate("Signup")} style={styles.linkWrap}>
            <Text style={styles.link}>Need an account? Start signup</Text>
          </Pressable>
        </SurfaceCard>
      </ScreenShell>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.canvas
  },
  shellContent: {
    justifyContent: "center",
    paddingTop: 28,
    paddingBottom: 32
  },
  card: {
    gap: 12
  },
  logo: {
    marginBottom: 2
  },
  badgeRow: {
    flexDirection: "row"
  },
  badge: {
    borderRadius: 999,
    backgroundColor: palette.blush,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  badgeText: {
    color: palette.navy,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: palette.ink
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
  button: {
    backgroundColor: palette.navy,
    borderRadius: 16,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2
  },
  disabled: {
    opacity: 0.7
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15
  },
  error: {
    color: palette.coral,
    fontWeight: "600"
  },
  linkWrap: {
    paddingTop: 4
  },
  link: {
    color: palette.blue,
    fontWeight: "700"
  }
});
