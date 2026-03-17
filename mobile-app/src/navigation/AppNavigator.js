import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import BrandLogo from "../components/BrandLogo";
import { useAuth } from "../context/AuthContext";
import CreatePostScreen from "../screens/CreatePostScreen";
import DaoCreateProposalScreen from "../screens/DaoCreateProposalScreen";
import DaoDashboardScreen from "../screens/DaoDashboardScreen";
import DaoProposalDetailScreen from "../screens/DaoProposalDetailScreen";
import DashboardScreen from "../screens/DashboardScreen";
import FeedScreen from "../screens/FeedScreen";
import LoginScreen from "../screens/LoginScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SettingsScreen from "../screens/SettingsScreen";
import SignupScreen from "../screens/SignupScreen";
import { palette, radius } from "../theme";

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function TabGlyph({ focused, label }) {
  return (
    <View style={[styles.glyph, focused && styles.glyphActive]}>
      <Text style={[styles.glyphText, focused && styles.glyphTextActive]}>{label.slice(0, 1)}</Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tabs.Navigator
      initialRouteName="Feed"
      screenOptions={{
        headerStyle: { backgroundColor: palette.mist },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "800", color: palette.ink, fontSize: 17 },
        headerTintColor: palette.ink,
        headerTitle: ({ children }) => <BrandLogo compact wordmark={children !== "Create"} />,
        tabBarActiveTintColor: palette.blue,
        tabBarInactiveTintColor: palette.slate,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem
      }}
    >
      <Tabs.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarIcon: ({ focused }) => <TabGlyph focused={focused} label="Dashboard" /> }}
      />
      <Tabs.Screen
        name="Feed"
        component={FeedScreen}
        options={{ tabBarIcon: ({ focused }) => <TabGlyph focused={focused} label="Feed" /> }}
      />
      <Tabs.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{ title: "Create", tabBarIcon: ({ focused }) => <TabGlyph focused={focused} label="Create" /> }}
      />
      <Tabs.Screen
        name="DaoDashboard"
        component={DaoDashboardScreen}
        options={{ title: "DAO", tabBarIcon: ({ focused }) => <TabGlyph focused={focused} label="DAO" /> }}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabGlyph focused={focused} label="Profile" /> }}
      />
    </Tabs.Navigator>
  );
}

export default function AppNavigator() {
  const { accessToken, booting } = useAuth();

  if (booting) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={palette.blue} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: palette.mist },
        headerShadowVisible: false,
        headerTintColor: palette.ink,
        headerTitleStyle: { fontWeight: "800", color: palette.ink }
      }}
    >
      {accessToken ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="DaoProposalDetail" component={DaoProposalDetailScreen} options={{ title: "Proposal Detail" }} />
          <Stack.Screen name="DaoCreateProposal" component={DaoCreateProposalScreen} options={{ title: "Create DAO Proposal" }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Signup" component={SignupScreen} options={{ headerShown: false }} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.canvas
  },
  tabBar: {
    height: 76,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: "rgba(248,251,255,0.96)",
    borderTopWidth: 0,
    elevation: 0
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4
  },
  tabItem: {
    paddingVertical: 4
  },
  glyph: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dde7f6"
  },
  glyphActive: {
    backgroundColor: palette.blue
  },
  glyphText: {
    color: palette.inkSoft,
    fontWeight: "800",
    fontSize: 12
  },
  glyphTextActive: {
    color: "#ffffff"
  }
});
