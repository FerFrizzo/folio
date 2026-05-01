// Lightweight className concatenation. NativeWind does not need tailwind-merge
// for its own utilities, but a clsx-style helper is convenient for conditionals.

export function cn(
  ...args: (string | false | null | undefined | Record<string, boolean>)[]
): string {
  const out: string[] = [];
  for (const arg of args) {
    if (!arg) continue;
    if (typeof arg === "string") {
      out.push(arg);
    } else if (typeof arg === "object") {
      for (const [key, val] of Object.entries(arg)) {
        if (val) out.push(key);
      }
    }
  }
  return out.join(" ");
}
