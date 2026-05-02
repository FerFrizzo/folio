import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Paperclip, X } from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import { Sheet } from "@/src/components/ui/Sheet";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { useToast } from "@/src/components/ui/Toast";
import { useProfile, useSettings } from "@/src/features/settings/queries";
import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENTS_BYTES,
  sendInvoiceEmail,
  type ClientAttachment,
} from "@/src/features/invoices/sendEmail";
import { substituteEmailVars } from "@/src/lib/templating";
import { formatMoney } from "@/src/lib/money";
import type { Invoice } from "@/src/types/schemas";

type Props = {
  invoice: Invoice | null;
  onClose: () => void;
  onSent?: () => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmail(v: string): boolean {
  return EMAIL_RE.test(v.trim());
}

function parseCc(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function bytesLabel(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function SendEmailSheet({ invoice, onClose, onSent }: Props) {
  const profile = useProfile();
  const settings = useSettings();
  const toast = useToast();
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<ClientAttachment[]>([]);
  const [progress, setProgress] = useState<"idle" | "sending">("idle");

  useEffect(() => {
    if (!invoice) return;
    const vars: Record<string, string> = {
      number: invoice.number || "DRAFT",
      total: formatMoney(invoice.totalCents, invoice.currency),
      dueDate: invoice.dueDate,
      businessName: profile.data?.businessName || "Your business",
      clientName: invoice.clientSnapshot.name,
    };
    setTo(invoice.clientSnapshot.email ?? "");
    setCc("");
    setSubject(
      substituteEmailVars(
        settings.data?.emailDefaults.subject ||
          "{{number}} from {{businessName}}",
        vars,
      ),
    );
    setBody(
      substituteEmailVars(
        settings.data?.emailDefaults.body ||
          "Hi {{clientName}},\n\nPlease find {{number}} attached. Total {{total}} due {{dueDate}}.\n\nThanks,\n{{businessName}}",
        vars,
      ),
    );
    setAttachments([]);
  }, [invoice, profile.data, settings.data]);

  if (!invoice) return null;

  async function pickAttachment() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled) return;
    const next: ClientAttachment[] = attachments.slice();
    for (const asset of result.assets) {
      if (next.length >= MAX_ATTACHMENTS) {
        toast.show({ message: `Max ${MAX_ATTACHMENTS} files.`, variant: "warning" });
        break;
      }
      const sizeBytes = asset.size ?? 0;
      const candidateTotal = next.reduce((s, a) => s + a.sizeBytes, 0) + sizeBytes;
      if (candidateTotal > MAX_ATTACHMENTS_BYTES) {
        toast.show({
          message: "Attachments exceed 10 MB combined.",
          variant: "warning",
        });
        break;
      }
      next.push({
        filename: asset.name ?? "attachment",
        mimeType: asset.mimeType ?? "application/octet-stream",
        uri: asset.uri,
        sizeBytes,
      });
    }
    setAttachments(next);
  }

  function removeAttachment(index: number) {
    setAttachments((curr) => curr.filter((_, i) => i !== index));
  }

  async function submit() {
    if (!invoice) return;
    if (!isEmail(to)) {
      toast.show({ message: "Enter a valid email address.", variant: "error" });
      return;
    }
    const ccList = parseCc(cc);
    for (const c of ccList) {
      if (!isEmail(c)) {
        toast.show({ message: `Invalid Cc: ${c}`, variant: "error" });
        return;
      }
    }
    setProgress("sending");
    try {
      await sendInvoiceEmail({
        invoiceId: invoice.id,
        to,
        ...(ccList.length ? { cc: ccList } : {}),
        subject,
        body,
        attachments,
      });
      toast.show({ message: `${invoice.number || "Invoice"} sent.`, variant: "success" });
      onClose();
      onSent?.();
    } catch (err) {
      toast.show({
        message: err instanceof Error ? err.message : "Send failed.",
        variant: "error",
      });
    } finally {
      setProgress("idle");
    }
  }

  const totalBytes = attachments.reduce((s, a) => s + a.sizeBytes, 0);

  return (
    <Sheet visible={!!invoice} onClose={onClose} title="Send invoice">
      <View className="gap-3">
        <Input
          label="To"
          required
          value={to}
          onChangeText={setTo}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="client@example.com"
        />
        <Input
          label="Cc (comma-separated)"
          value={cc}
          onChangeText={setCc}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input label="Subject" required value={subject} onChangeText={setSubject} />
        <Input label="Message" value={body} onChangeText={setBody} multiline />

        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-label text-foreground">
              Attachments ({attachments.length}/{MAX_ATTACHMENTS} ·{" "}
              {bytesLabel(totalBytes)}/10 MB)
            </Text>
            <Pressable
              onPress={pickAttachment}
              accessibilityRole="button"
              accessibilityLabel="Add attachment"
              hitSlop={8}
              className="flex-row items-center gap-1"
            >
              <Paperclip size={14} color="#0B3D5C" />
              <Text className="text-label font-semibold text-accent">Add files</Text>
            </Pressable>
          </View>
          {attachments.map((a, i) => (
            <View
              key={`${a.uri}-${i}`}
              className="flex-row items-center justify-between rounded-button border border-border bg-surface px-3 py-2"
            >
              <View className="flex-1">
                <Text className="text-body text-foreground" numberOfLines={1}>
                  {a.filename}
                </Text>
                <Text className="text-caption text-muted">{bytesLabel(a.sizeBytes)}</Text>
              </View>
              <Pressable
                onPress={() => removeAttachment(i)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${a.filename}`}
                hitSlop={8}
              >
                <X size={16} color="#6B7280" />
              </Pressable>
            </View>
          ))}
        </View>

        <View className="flex-row justify-end gap-2">
          <Button label="Cancel" variant="ghost" onPress={onClose} />
          <Button
            label={progress === "sending" ? "Sending…" : "Send"}
            disabled={progress === "sending"}
            onPress={submit}
          />
        </View>
      </View>
    </Sheet>
  );
}
