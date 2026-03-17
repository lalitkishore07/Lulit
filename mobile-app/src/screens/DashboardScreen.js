import { Pressable, StyleSheet, Text, View } from "react-native";
import BrandLogo from "../components/BrandLogo";
import { useAuth } from "../context/AuthContext";
import ScreenShell from "../components/ScreenShell";
import SurfaceCard from "../components/SurfaceCard";
import { palette } from "../theme";

function QuickCard({ title, subtitle, kicker, onPress }) {
  return (
    <Pressable onPress={onPress}>
      <SurfaceCard style={styles.card}>
        <Text style={styles.cardKicker}>{kicker}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </SurfaceCard>
    </Pressable>
  );
}

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();

  return (
    <ScreenShell
      eyebrow="Control Center"
      title={`Welcome, @${user?.username || "lulit"}`}
      subtitle="Jump between the feed, publishing, profile, and community governance from one tighter hub."
    >
      <BrandLogo />
      <SurfaceCard style={styles.heroCard}>
        <Text style={styles.heroLabel}>Today on Lulit</Text>
        <Text style={styles.heroHeadline}>Post fast. Validate what matters. Vote with intent.</Text>
      </SurfaceCard>
      <View style={styles.grid}>
        <QuickCard kicker="Discover" title="Feed" subtitle="Browse the latest verified posts" onPress={() => navigation.navigate("Feed")} />
        <QuickCard kicker="Publish" title="Create Post" subtitle="Upload media and push new updates live" onPress={() => navigation.navigate("CreatePost")} />
        <QuickCard kicker="Govern" title="DAO" subtitle="Review proposals and cast community votes" onPress={() => navigation.navigate("DaoDashboard")} />
        <QuickCard kicker="Tune" title="Settings" subtitle="Control refresh cadence and media behavior" onPress={() => navigation.navigate("Settings")} />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: "rgba(23,51,122,0.96)"
  },
  heroLabel: {
    color: "#93c5fd",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  heroHeadline: {
    color: "#ffffff",
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "900",
    marginTop: 8
  },
  grid: {
    gap: 12
  },
  card: {
    gap: 6
  },
  cardKicker: {
    color: palette.cyan,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: palette.ink
  },
  cardSubtitle: {
    color: palette.inkSoft,
    lineHeight: 20
  }
});
