import type { CurrencyCode } from "./types";

const symbols: Record<CurrencyCode, string> = {
  AUD: "$",
  USD: "US$",
  EUR: "€",
  GBP: "£",
  NZD: "NZ$",
};

export function formatMoney(amount: number, code: CurrencyCode = "AUD"): string {
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const whole = Math.floor(abs / 100);
  const cents = abs % 100;
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const symbol = symbols[code] ?? "$";
  return `${negative ? "-" : ""}${symbol}${grouped}.${cents.toString().padStart(2, "0")}`;
}
