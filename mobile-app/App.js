import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { palette } from "./src/theme";

const navTheme = {
  dark: false,
  colors: {
    primary: palette.blue,
    background: palette.canvas,
    card: palette.mist,
    text: palette.ink,
    border: palette.line,
    notification: palette.coral
  }
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="dark" backgroundColor={palette.canvas} />
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
