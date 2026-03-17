import { StyleSheet, View } from "react-native";
import { palette, radius, shadow } from "../theme";

export default function SurfaceCard({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 16,
    ...shadow.card
  }
});
