import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import ScreenShell from "../components/ScreenShell";
import SurfaceCard from "../components/SurfaceCard";
import api from "../services/api";
import { palette } from "../theme";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export default function CreatePostScreen({ navigation }) {
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const chooseFile = async () => {
    setError("");
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "video/*"],
      multiple: false,
      copyToCacheDirectory: true
    });

    if (result.canceled) return;
    const picked = result.assets?.[0];
    if (!picked) return;
    if (picked.size && picked.size > MAX_FILE_SIZE) {
      setFile(null);
      setError("File exceeds 50MB limit");
      return;
    }
    setFile(picked);
  };

  const submit = async () => {
    if (!file) {
      setError("Attach exactly one media file");
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("caption", caption.trim());
      formData.append("file", {
        uri: file.uri,
        name: file.name || "upload.bin",
        type: file.mimeType || "application/octet-stream"
      });

      const { data } = await api.post("/posts", formData);
      if (data.moderationStatus === "PENDING_REVIEW") {
        setMessage(
          data.moderationDaoProposalId
            ? `Post sent to DAO review (proposal #${data.moderationDaoProposalId}).`
            : "Post sent to moderation review."
        );
      } else {
        setMessage(data.ipfsCid ? `Post created. CID: ${data.ipfsCid}` : "Thought posted successfully");
      }
      setCaption("");
      setFile(null);
      if (data.moderationStatus === "APPROVED") {
        navigation.navigate("Feed");
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Post creation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell
      eyebrow="Publishing Studio"
      title="Create a post"
      subtitle="Share media, add context, and let Lulit route moderation when required."
      scroll
    >
      <SurfaceCard style={styles.card}>
        <Text style={styles.sectionLabel}>Caption</Text>
        <TextInput
          style={styles.input}
          multiline
          numberOfLines={6}
          placeholder="What should the community see first?"
          placeholderTextColor="#7c8aa5"
          value={caption}
          onChangeText={setCaption}
        />
        <Text style={styles.sectionLabel}>Media</Text>
        <Pressable style={styles.pickBtn} onPress={chooseFile}>
          <Text style={styles.pickBtnText}>{file ? "Swap Media" : "Choose Image or Video"}</Text>
        </Pressable>
        <Text style={styles.fileText}>{file ? `${file.name || "selected"} (${file.mimeType || "unknown"})` : "No media selected yet"}</Text>

        <Pressable style={[styles.submitBtn, loading && styles.disabled]} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Publish Post</Text>}
        </Pressable>

        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </SurfaceCard>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10
  },
  sectionLabel: {
    color: palette.slate,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccd8e8",
    borderRadius: 18,
    backgroundColor: "#f7faff",
    color: palette.ink,
    paddingHorizontal: 14,
    paddingVertical: 14,
    textAlignVertical: "top"
  },
  pickBtn: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ccd8e8",
    backgroundColor: "#f7faff",
    paddingVertical: 14,
    alignItems: "center"
  },
  pickBtnText: {
    color: palette.ink,
    fontWeight: "800"
  },
  fileText: {
    color: palette.slate,
    fontSize: 12
  },
  submitBtn: {
    marginTop: 6,
    borderRadius: 18,
    backgroundColor: palette.navy,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center"
  },
  submitText: {
    color: "#fff",
    fontWeight: "800"
  },
  disabled: {
    opacity: 0.7
  },
  success: {
    color: palette.mint,
    fontWeight: "700"
  },
  error: {
    color: palette.coral,
    fontWeight: "700"
  }
});
