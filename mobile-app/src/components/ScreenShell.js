import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, radius } from "../theme";

export default function ScreenShell({
  children,
  title,
  eyebrow,
  subtitle,
  action,
  scroll = false,
  contentStyle,
  bodyStyle
}) {
  const Body = scroll ? ScrollView : View;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.background}>
        <View style={styles.blobOne} />
        <View style={styles.blobTwo} />
        <View style={styles.blobThree} />
      </View>
      <Body
        style={styles.body}
        contentContainerStyle={scroll ? [styles.bodyContent, bodyStyle] : undefined}
      >
        <View style={[styles.content, !scroll && styles.bodyContent, contentStyle]}>
          {(title || eyebrow || subtitle || action) ? (
            <View style={styles.hero}>
              <View style={styles.heroTextWrap}>
                {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
                {title ? <Text style={styles.title}>{title}</Text> : null}
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              {action ? <View style={styles.actionWrap}>{action}</View> : null}
            </View>
          ) : null}
          {children}
        </View>
      </Body>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.canvas
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.canvas
  },
  blobOne: {
    position: "absolute",
    top: -120,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "#dbeafe"
  },
  blobTwo: {
    position: "absolute",
    top: 90,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "#fde68a"
  },
  blobThree: {
    position: "absolute",
    bottom: -90,
    right: -70,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "#cffafe"
  },
  body: {
    flex: 1
  },
  bodyContent: {
    paddingHorizontal: 18,
    paddingBottom: 28
  },
  content: {
    flex: 1,
    gap: 14
  },
  hero: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: radius.xl,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
    marginBottom: 2
  },
  heroTextWrap: {
    gap: 4
  },
  eyebrow: {
    color: palette.blue,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  title: {
    color: palette.ink,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.8
  },
  subtitle: {
    color: palette.inkSoft,
    fontSize: 14,
    lineHeight: 20
  },
  actionWrap: {
    marginTop: 14
  }
});
