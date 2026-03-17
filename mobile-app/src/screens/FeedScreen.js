import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import ScreenShell from "../components/ScreenShell";
import PostCard from "../components/PostCard";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { palette } from "../theme";
import { loadPreferences } from "../utils/preferences";

export default function FeedScreen() {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");
  const [prefs, setPrefs] = useState({ autoRefreshFeed: false, blurSensitiveMedia: false });

  const loadFeed = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    setError("");
    try {
      const { data } = await api.get("/posts/feed");
      setPosts(data || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to fetch feed");
    } finally {
      if (refresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    loadFeed(false);
  }, [loadFeed]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const next = await loadPreferences();
      if (mounted) setPrefs(next);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!prefs.autoRefreshFeed) return undefined;
    const timer = setInterval(() => loadFeed(true), 30000);
    return () => clearInterval(timer);
  }, [prefs.autoRefreshFeed, loadFeed]);

  const validatePost = async (postId, choice) => {
    try {
      const { data } = await api.post(`/posts/${postId}/validate`, { choice });
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                myValidation: data.myValidation,
                supportCount: data.supportCount,
                challengeCount: data.challengeCount
              }
            : post
        )
      );
    } catch (e) {
      setError(e?.response?.data?.message || "Unable to validate this post");
    }
  };

  return (
    <ScreenShell
      eyebrow="Live Stream"
      title="Community feed"
      subtitle="High-signal posts, validation counts, and moderation-aware media previews."
      action={(
        <Pressable style={styles.refreshBtn} onPress={() => loadFeed(true)}>
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </Pressable>
      )}
      contentStyle={styles.shellContent}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={palette.blue} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <PostCard post={item} onValidate={validatePost} blurSensitiveMedia={prefs.blurSensitiveMedia} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadFeed(true)} tintColor={palette.blue} />}
          ListEmptyComponent={<Text style={styles.empty}>No posts yet.</Text>}
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  shellContent: {
    paddingBottom: 0
  },
  refreshBtn: {
    backgroundColor: palette.ink,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  refreshBtnText: {
    color: "#fff",
    fontWeight: "800"
  },
  listContent: {
    paddingBottom: 22
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  error: {
    color: palette.coral,
    marginBottom: 10,
    fontWeight: "700"
  },
  empty: {
    textAlign: "center",
    color: palette.slate,
    marginTop: 24
  }
});
