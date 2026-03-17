import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { formatPostDateTime } from "../utils/date";
import SurfaceCard from "./SurfaceCard";
import { palette } from "../theme";

export default function PostCard({ post, onValidate, blurSensitiveMedia = false }) {
  const isSupported = post.myValidation === "SUPPORT";
  const isChallenged = post.myValidation === "CHALLENGE";

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{String(post.username || "L").slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.metaWrap}>
          <Text style={styles.username}>@{post.username}</Text>
          {post.createdAt ? <Text style={styles.time}>{formatPostDateTime(post.createdAt)}</Text> : null}
        </View>
      </View>
      {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}
      {post.mediaUrl && post.mediaMimeType?.startsWith("image/") ? (
        <Image
          source={{ uri: post.mediaUrl }}
          style={[styles.image, blurSensitiveMedia && styles.imageBlur]}
          resizeMode="cover"
          blurRadius={blurSensitiveMedia ? 12 : 0}
        />
      ) : null}
      {post.mediaUrl && post.mediaMimeType?.startsWith("video/") ? (
        <Text style={styles.mediaHint}>Video post</Text>
      ) : null}
      {onValidate ? (
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, isSupported && styles.actionBtnActiveSupport]}
            onPress={() => onValidate(post.id, "SUPPORT")}
          >
            <Text style={[styles.actionText, isSupported && styles.actionTextActive]}>Support {post.supportCount || 0}</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, isChallenged && styles.actionBtnActiveChallenge]}
            onPress={() => onValidate(post.id, "CHALLENGE")}
          >
            <Text style={[styles.actionText, isChallenged && styles.actionTextActive]}>Challenge {post.challengeCount || 0}</Text>
          </Pressable>
        </View>
      ) : null}
      <Text style={styles.meta}>
        Support {post.supportCount || 0}  |  Challenge {post.challengeCount || 0}
      </Text>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.navy
  },
  avatarText: {
    color: "#fff",
    fontWeight: "900"
  },
  metaWrap: {
    flex: 1
  },
  username: {
    fontSize: 14,
    fontWeight: "800",
    color: palette.ink
  },
  caption: {
    marginTop: 8,
    color: palette.inkSoft,
    fontSize: 15,
    lineHeight: 22
  },
  image: {
    marginTop: 10,
    width: "100%",
    height: 250,
    borderRadius: 12,
    backgroundColor: "#e5e7eb"
  },
  imageBlur: {
    opacity: 0.92
  },
  mediaHint: {
    marginTop: 10,
    color: palette.slate,
    fontSize: 13
  },
  actions: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8
  },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d3ddeb",
    backgroundColor: "#f8fbff"
  },
  actionBtnActiveSupport: {
    backgroundColor: "#dcfce7",
    borderColor: "#10b981"
  },
  actionBtnActiveChallenge: {
    backgroundColor: "#fee2e2",
    borderColor: "#ef4444"
  },
  actionText: {
    color: palette.inkSoft,
    fontWeight: "700",
    fontSize: 12
  },
  actionTextActive: {
    color: palette.ink
  },
  time: {
    fontSize: 12,
    color: palette.slate,
    textTransform: "uppercase"
  },
  meta: {
    marginTop: 8,
    fontSize: 12,
    color: palette.slate
  }
});
