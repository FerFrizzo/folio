import {
  dinero,
  toDecimal,
  AUD,
  USD,
  EUR,
  GBP,
  NZD,
  type Dinero,
  type DineroCurrency,
} from "dinero.js";

// Money math goes through Dinero.js v2 with integer minor units. Per spec §2/§5:
//   - Store all amounts as integer cents in the invoice's currency.
//   - Format only at render. Never use floats for money.

const CurrencyMap: Record<string, DineroCurrency<number>> = {
  AUD,
  USD,
  EUR,
  GBP,
  NZD,
};

export type CurrencyCode = "AUD" | "USD" | "EUR" | "GBP" | "NZD";

export function getCurrency(code: CurrencyCode): DineroCurrency<number> {
  const c = CurrencyMap[code];
  if (!c) throw new Error(`Unsupported currency: ${code}`);
  return c;
}

export function fromCents(amount: number, code: CurrencyCode = "AUD"): Dinero<number> {
  return dinero({ amount, currency: getCurrency(code) });
}

const symbols: Record<CurrencyCode, string> = {
  AUD: "$",
  USD: "US$",
  EUR: "€",
  GBP: "£",
  NZD: "NZ$",
};

export function formatMoney(amount: number, code: CurrencyCode = "AUD"): string {
  const d = fromCents(amount, code);
  const decimal = toDecimal(d);
  // toDecimal returns "1234.56" — prepend symbol and add thousands separators.
  const [whole, fraction = "00"] = decimal.split(".");
  const grouped = (whole ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${symbols[code]}${grouped}.${fraction.padEnd(2, "0").slice(0, 2)}`;
}
