import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Card } from "@/src/components/ui/Card";
import { Input } from "@/src/components/ui/Input";
import { Button } from "@/src/components/ui/Button";
import { useToast } from "@/src/components/ui/Toast";
import { EMAIL_VARS } from "@/src/lib/templating";
import {
  useSettings,
  useSetSettings,
} from "@/src/features/settings/queries";
import { SettingsSchema } from "@/src/types/schemas";

export function EmailDefaultsCard() {
  const settings = useSettings();
  const setSettings = useSetSettings();
  const toast = useToast();

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [activeField, setActiveField] = useState<"subject" | "body">("body");

  useEffect(() => {
    if (!settings.data) return;
    setSubject(settings.data.emailDefaults.subject);
    setBody(settings.data.emailDefaults.body);
  }, [settings.data]);

  function insertVar(name: string) {
    const token = `{{${name}}}`;
    if (activeField === "subject") setSubject((s) => s + token);
    else setBody((s) => s + token);
  }

  async function save() {
    if (!settings.data) return;
    try {
      const next = SettingsSchema.parse({
        ...settings.data,
        emailDefaults: { subject, body },
      });
      await setSettings.mutateAsync(next);
      toast.show({ message: "Email defaults saved.", variant: "success" });
    } catch (err) {
      console.error(err);
      toast.show({
        message: err instanceof Error ? err.message : "Couldn't save.",
        variant: "error",
      });
    }
  }

  return (
    <Card>
      <Text className="text-h2 text-foreground">Email defaults</Text>
      <Text className="mt-1 text-caption text-muted">
        Templates pre-fill the Send sheet. Tap a variable below to insert it.
      </Text>

      <View className="mt-3 flex-row flex-wrap gap-2">
        {EMAIL_VARS.map((name) => (
          <Pressable
            key={name}
            onPress={() => insertVar(name)}
            accessibilityRole="button"
            accessibilityLabel={`Insert ${name}`}
            className="rounded-chip border border-border bg-surface px-3 py-1 active:bg-background"
          >
            <Text className="text-label font-semibold text-accent">{`{{${name}}}`}</Text>
          </Pressable>
        ))}
      </View>

      <View className="mt-4 gap-3">
        <Input
          label="Subject"
          value={subject}
          onChangeText={(v) => {
            setSubject(v);
            setActiveField("subject");
          }}
          placeholder="{{number}} from {{businessName}}"
        />
        <Input
          label="Body"
          value={body}
          onChangeText={(v) => {
            setBody(v);
            setActiveField("body");
          }}
          multiline
          placeholder="Hi {{clientName}}, …"
        />
        <Button
          label={setSettings.isPending ? "Saving…" : "Save defaults"}
          disabled={setSettings.isPending}
          onPress={save}
        />
      </View>
    </Card>
  );
}
