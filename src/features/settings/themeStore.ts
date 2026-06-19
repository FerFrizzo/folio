import { colorScheme } from "nativewind";
import { Platform } from "react-native";

// Force light mode on all platforms.
const canApply = Platform.OS !== "web" || typeof window !== "undefined";
if (canApply) colorScheme.set("light");
