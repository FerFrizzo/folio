import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { Switch } from "@/src/components/ui/Switch";
import { useToast } from "@/src/components/ui/Toast";
import {
  setPin,
  clearPin,
  hasPin,
  isValidPin,
  Platform_supportsBiometric,
} from "@/src/features/auth/pin";

export function SecurityCard() {
  const toast = useToast();
  const [pinSet, setPinSet] = useState<boolean | null>(null);
  const [pinValue, setPinValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [biometricEnrolled, setBiometricEnrolled] = useState<boolean>(false);

  useEffect(() => {
    void hasPin().then(setPinSet);
    if (Platform_supportsBiometric) {
      void Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]).then(([hardware, enrolled]) => {
        setBiometricEnrolled(hardware && enrolled);
      });
    }
  }, []);

  async function save() {
    if (!isValidPin(pinValue)) {
      toast.show({ message: "PIN must be 4–6 digits.", variant: "error" });
      return;
    }
    if (pinValue !== confirm) {
      toast.show({ message: "PINs don't match.", variant: "error" });
      return;
    }
    await setPin(pinValue);
    setPinSet(true);
    setPinValue("");
    setConfirm("");
    toast.show({ message: "PIN saved.", variant: "success" });
  }

  async function remove() {
    await clearPin();
    setPinSet(false);
    toast.show({ message: "PIN cleared.", variant: "info" });
  }

  return (
    <Card>
      <Text className="text-h2 text-foreground">Security</Text>
      <Text className="mt-1 text-caption text-muted">
        PIN gates the app on launch. Biometric is used first when available.
      </Text>

      <View className="mt-4 gap-3">
        {pinSet ? (
          <View className="flex-row items-center justify-between">
            <Text className="text-body text-foreground">PIN is set</Text>
            <Button label="Remove" variant="ghost" onPress={remove} />
          </View>
        ) : (
          <>
            <Input
              label="New PIN"
              required
              value={pinValue}
              onChangeText={setPinValue}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              placeholder="4–6 digits"
            />
            <Input
              label="Confirm PIN"
              required
              value={confirm}
              onChangeText={setConfirm}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
            />
            <Button label="Save PIN" onPress={save} />
          </>
        )}

        {Platform_supportsBiometric ? (
          <View className="mt-2">
            <Switch
              label="Use biometric when available"
              helperText={
                biometricEnrolled
                  ? "Face ID / fingerprint / device PIN."
                  : "No biometric enrolled on this device."
              }
              value={biometricEnrolled}
              onValueChange={() => undefined}
              disabled={!biometricEnrolled}
            />
          </View>
        ) : (
          <Text className="mt-2 text-caption text-muted">
            Web has no biometric — PIN only.
          </Text>
        )}
      </View>
    </Card>
  );
}
