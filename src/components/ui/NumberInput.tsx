import { useCallback } from "react";
import { Input } from "@/src/components/ui/Input";

type Props = {
  label?: string;
  error?: string | null;
  required?: boolean;
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  decimals?: number;
};

const NUMERIC_RE = /^-?\d*(?:\.\d*)?$/;

export function NumberInput({
  label,
  error,
  required,
  value,
  onChangeText,
  placeholder,
  decimals,
}: Props) {
  const handleChange = useCallback(
    (raw: string) => {
      if (raw === "") return onChangeText("");
      if (!NUMERIC_RE.test(raw)) return;
      if (decimals != null) {
        const dot = raw.indexOf(".");
        if (dot >= 0 && raw.length - dot - 1 > decimals) return;
      }
      onChangeText(raw);
    },
    [onChangeText, decimals],
  );

  return (
    <Input
      label={label}
      error={error ?? null}
      required={!!required}
      value={value}
      onChangeText={handleChange}
      keyboardType="decimal-pad"
      placeholder={placeholder}
      className="font-[Inter] [font-feature-settings:'tnum']"
    />
  );
}
