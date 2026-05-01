import { useState } from "react";
import { Image, Text, View } from "react-native";
import { useToast } from "@/src/components/ui/Toast";
import { Button } from "@/src/components/ui/Button";
import { useAuth } from "@/src/features/auth/AuthProvider";
import { pickAndUploadLogo } from "@/src/lib/storage/uploadLogo";
import { useProfile, useSetProfile } from "@/src/features/settings/queries";
import { ProfileSchema } from "@/src/types/schemas";

export function LogoPicker() {
  const auth = useAuth();
  const profile = useProfile();
  const setProfile = useSetProfile();
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  const logoUrl = profile.data?.logoUrl;

  async function pick() {
    if (auth.status !== "ready") return;
    setUploading(true);
    try {
      const result = await pickAndUploadLogo(auth.user.uid);
      if (!result.ok) {
        if (result.reason === "permission") {
          toast.show({
            message: "Photo library permission denied.",
            variant: "error",
          });
        } else if (result.reason === "upload-failed") {
          toast.show({ message: "Upload failed. Try again.", variant: "error" });
        }
        return;
      }
      const next = ProfileSchema.parse({
        ...(profile.data ?? {}),
        logoUrl: result.url,
      });
      await setProfile.mutateAsync(next);
      toast.show({ message: "Logo updated.", variant: "success" });
    } finally {
      setUploading(false);
    }
  }

  async function clear() {
    if (!profile.data) return;
    // Strip logoUrl from the profile. We leave the Storage object in place —
    // future uploads to the same path overwrite it. Per spec §10 the profile
    // doc is the source of truth; the Storage object isn't user-facing data.
    const { logoUrl: _omit, ...rest } = profile.data;
    void _omit;
    await setProfile.mutateAsync(ProfileSchema.parse(rest));
    toast.show({ message: "Logo removed.", variant: "info" });
  }

  return (
    <View className="gap-3">
      <Text className="text-label text-foreground">Logo</Text>
      <View className="h-24 items-center justify-center overflow-hidden rounded-card border border-dashed border-border bg-background">
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            style={{ width: 200, height: 80 }}
            resizeMode="contain"
            accessibilityLabel="Business logo"
          />
        ) : (
          <Text className="text-caption text-muted">No logo uploaded</Text>
        )}
      </View>
      <View className="flex-row gap-2">
        <Button
          label={uploading ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
          variant="secondary"
          disabled={uploading}
          onPress={pick}
        />
        {logoUrl ? (
          <Button label="Remove" variant="ghost" onPress={clear} />
        ) : null}
      </View>
      <Text className="text-caption text-muted">
        Resized to ≤500 px wide on upload. PNG.
      </Text>
    </View>
  );
}
