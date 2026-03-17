import "react-native-gesture-handler";
import "react-native-get-random-values";
import { TextDecoder, TextEncoder } from "text-encoding";
import { registerRootComponent } from "expo";
import App from "./App";

if (!global.TextEncoder) {
  global.TextEncoder = TextEncoder;
}

if (!global.TextDecoder) {
  global.TextDecoder = TextDecoder;
}

registerRootComponent(App);
