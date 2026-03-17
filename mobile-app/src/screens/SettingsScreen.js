import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { defaultPreferences, loadPreferences, savePreferences } from "../utils/preferences";
import ScreenShell from "../components/ScreenShell";
import SurfaceCard from "../components/SurfaceCard";
import { palette } from "../theme";

function Row({ label, description, value, onChange }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{label}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

export default function SettingsScreen() {
  const [prefs, setPrefs] = useState(defaultPreferences);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const loaded = await loadPreferences();
      if (mounted) setPrefs(loaded);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const update = async (patch) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    await savePreferences(next);
  };

  const reset = async () => {
    setPrefs(defaultPreferences);
    await savePreferences(defaultPreferences);
  };

  return (
    <ScreenShell
      eyebrow="Preferences"
      title="Settings"
      subtitle="Tune responsiveness, moderation previews, and the way the app behaves day to day."
    >
      <SurfaceCard style={styles.card}>
        <Row
          label="Auto Refresh Feed"
          description="Refreshes feed every 30 seconds."
          value={prefs.autoRefreshFeed}
          onChange={(autoRefreshFeed) => update({ autoRefreshFeed })}
        />
        <Row
          label="Blur Media Previews"
          description="Blurs images in feed cards."
          value={prefs.blurSensitiveMedia}
          onChange={(blurSensitiveMedia) => update({ blurSensitiveMedia })}
        />
      </SurfaceCard>

      <Pressable style={styles.resetBtn} onPress={reset}>
        <Text style={styles.resetText}>Reset Defaults</Text>
      </Pressable>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 14
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0"
  },
  rowTitle: {
    fontWeight: "800",
    color: palette.ink
  },
  rowDescription: {
    marginTop: 2,
    color: palette.slate,
    fontSize: 12
  },
  resetBtn: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ccd8e8",
    backgroundColor: "#f7faff",
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center"
  },
  resetText: {
    fontWeight: "800",
    color: palette.ink
  }
});
