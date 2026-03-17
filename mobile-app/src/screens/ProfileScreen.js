import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import ScreenShell from "../components/ScreenShell";
import SurfaceCard from "../components/SurfaceCard";
import api from "../services/api";
import { palette } from "../theme";

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/profile/me");
        if (mounted) setProfile(data);
      } catch (e) {
        if (mounted) setError(e?.response?.data?.message || "Failed to load profile");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ScreenShell
      eyebrow="Account Space"
      title="Your profile"
      subtitle="Identity, presence, and social graph in one compact view."
      scroll
      bodyStyle={styles.content}
    >
      {loading ? (
        <ActivityIndicator size="large" color={palette.blue} />
      ) : (
        <SurfaceCard style={styles.card}>
          <View style={styles.identityRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{String(profile?.username || user?.username || "L").slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.identityText}>
              <Text style={styles.name}>{profile?.displayName || "Unnamed member"}</Text>
              <Text style={styles.handle}>@{profile?.username || user?.username || "-"}</Text>
            </View>
          </View>
          <Text style={styles.bio}>{profile?.bio || "No bio yet."}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{profile?.postsCount ?? 0}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{profile?.followersCount ?? 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{profile?.followingCount ?? 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>
        </SurfaceCard>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.settingsBtn} onPress={() => navigation.navigate("Settings")}>
        <Text style={styles.settingsText}>Open Settings</Text>
      </Pressable>
      <Pressable style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 30
  },
  card: {
    gap: 14
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: palette.navy,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900"
  },
  identityText: {
    flex: 1,
    gap: 3
  },
  name: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: "900"
  },
  handle: {
    color: palette.slate,
    fontWeight: "700"
  },
  bio: {
    color: palette.inkSoft,
    lineHeight: 22
  },
  statsRow: {
    flexDirection: "row",
    gap: 10
  },
  statBlock: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#f4f8ff",
    paddingVertical: 14,
    alignItems: "center"
  },
  statValue: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  statLabel: {
    color: palette.slate,
    fontSize: 12,
    marginTop: 2
  },
  error: {
    color: palette.coral,
    fontWeight: "700"
  },
  settingsBtn: {
    backgroundColor: "#f7faff",
    borderRadius: 18,
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#ccd8e8",
    alignItems: "center",
    justifyContent: "center"
  },
  settingsText: {
    color: palette.ink,
    fontWeight: "800"
  },
  logoutBtn: {
    backgroundColor: palette.ink,
    borderRadius: 18,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center"
  },
  logoutText: {
    color: "#fff",
    fontWeight: "800"
  }
});
