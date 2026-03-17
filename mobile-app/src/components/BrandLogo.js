import { Image, StyleSheet, Text, View } from "react-native";
import { palette } from "../theme";

const logoImage = require("../../assets/lulit-logo.png");

export default function BrandLogo({ compact = false, wordmark = true, style }) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact, style]}>
      <View style={[styles.tile, compact && styles.tileCompact]}>
        <Image
          source={logoImage}
          style={[styles.logo, compact && styles.logoCompact]}
          resizeMode="contain"
        />
      </View>
      {wordmark ? <Text style={[styles.wordmark, compact && styles.wordmarkCompact]}>LULIT</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  wrapCompact: {
    gap: 8
  },
  tile: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: "#0f1f43",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#09132e",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7
  },
  tileCompact: {
    width: 56,
    height: 56,
    borderRadius: 14
  },
  logo: {
    width: 50,
    height: 50
  },
  logoCompact: {
    width: 38,
    height: 38
  },
  wordmark: {
    color: palette.navy,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 4
  },
  wordmarkCompact: {
    fontSize: 16,
    letterSpacing: 3
  }
});
