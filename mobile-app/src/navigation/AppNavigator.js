import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import BrandLogo from "../components/BrandLogo";
import { useAuth } from "../context/AuthContext";
import CreatePostScreen from "../screens/CreatePostScreen";
import DaoCreateProposalScreen from "../screens/DaoCreateProposalScreen";
import DaoDashboardScreen from "../screens/DaoDashboardScreen";
import DaoProposalDetailScreen from "../screens/DaoProposalDetailScreen";
import FeedScreen from "../screens/FeedScreen";
import LoginScreen from "../screens/LoginScreen";
import MessagesScreen from "../screens/MessagesScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SettingsScreen from "../screens/SettingsScreen";
import SignupScreen from "../screens/SignupScreen";
import { palette, radius } from "../theme";

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function TabPill({ focused, label }) {
  return (
    <View style={[styles.tabPill, focused && styles.tabPillActive]}>
      <Text numberOfLines={1} style={[styles.tabPillText, focused && styles.tabPillTextActive]}>{label}</Text>
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
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem
      }}
    >
      <Tabs.Screen
        name="Feed"
        component={FeedScreen}
        options={{ tabBarIcon: ({ focused }) => <TabPill focused={focused} label="Feed" /> }}
      />
      <Tabs.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{ title: "Create", tabBarIcon: ({ focused }) => <TabPill focused={focused} label="Create" /> }}
      />
      <Tabs.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ tabBarIcon: ({ focused }) => <TabPill focused={focused} label="Messages" /> }}
      />
      <Tabs.Screen
        name="DaoDashboard"
        component={DaoDashboardScreen}
        options={{ title: "DAO", tabBarIcon: ({ focused }) => <TabPill focused={focused} label="DAO" /> }}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabPill focused={focused} label="Profile" /> }}
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
    height: 84,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: "#0f172a",
    borderTopWidth: 0,
    elevation: 0
  },
  tabItem: {
    paddingVertical: 4
  },
  tabPill: {
    minWidth: 58,
    paddingHorizontal: 10,
    height: 34,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  tabPillActive: {
    backgroundColor: "rgba(34,211,238,0.18)",
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.34)"
  },
  tabPillText: {
    color: "#cbd5e1",
    fontWeight: "800",
    fontSize: 11
  },
  tabPillTextActive: {
    color: "#ecfeff"
  }
});
