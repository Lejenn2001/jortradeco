interface SignalInfo {
  ticker?: string;
  type?: "bullish" | "bearish" | "neutral";
  putCall?: "call" | "put";
  strike?: string;
  expiry?: string;
  premium?: string;
  description?: string;
  tags?: string[];
}

function parsePremiumValue(raw: string): number {
  const cleaned = raw.replace(/[,$]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  if (/B$/i.test(raw)) return num * 1_000_000_000;
  if (/M$/i.test(raw)) return num * 1_000_000;
  if (/K$/i.test(raw)) return num * 1_000;
  return num;
}

function premiumColor(val: number): string {
  if (val >= 5_000_000) return "This is a massive bet. This trader means business and is extremely confident";
  if (val >= 2_000_000) return "That's a huge amount of money. This is a very serious, high-conviction play";
  if (val >= 1_000_000) return "Over a million dollars. That's a big bet and worth paying close attention to";
  if (val >= 500_000) return "That's a really significant amount. Someone with deep pockets is making a move";
  if (val >= 100_000) return "That's a solid bet. Enough money to show real conviction";
  return "A noteworthy trade worth keeping an eye on";
}

export function isSweep(signal: SignalInfo): boolean {
  const desc = signal.description || "";
  return /sweep/i.test(desc);
}

export function compactDescription(signal: SignalInfo): string {
  const desc = signal.description || "";
  const parts: string[] = [];

  const sweep = isSweep(signal);
  const sweepMatch = desc.match(/(\d+)\s*sweep/i);

  const premiumMatch = desc.match(/\$?([\d,.]+[KMB]?)\s*(?:premium|total)/i);
  if (premiumMatch) {
    const strike = signal.strike ? String(signal.strike).replace(/[^$\d.,]/g, '').replace('$', '') : "";
    const pc = signal.putCall === "put" ? "P" : signal.putCall === "call" ? "C" : "";
    const label = sweep
      ? `${sweepMatch ? sweepMatch[1] + "x " : ""}sweep`
      : "flow";
    parts.push(`$${premiumMatch[1]} ${label}${strike ? ` → $${strike}${pc}` : ""}`);
  }

  const volOiMatch = desc.match(/([\d.]+)x?\s*(?:vol(?:ume)?[/]?oi|volume[/-]open interest)/i);
  if (volOiMatch) parts.push(`${volOiMatch[1]}x Vol/OI`);

  const aggMatch = desc.match(/(\d+)%?\s*(?:ask\s*)?aggress/i);
  if (aggMatch) parts.push(`${aggMatch[1]}% aggression`);

  if (parts.length === 0) {
    return desc.length > 120 ? desc.slice(0, 117) + "…" : desc;
  }
  return parts.join(" · ");
}

export function simplifySignalDescription(signal: SignalInfo): string {
  const desc = signal.description || "";
  const parts: string[] = [];

  const direction = signal.type === "bullish" ? "bullish" : signal.type === "bearish" ? "bearish" : "neutral";
  const ticker = signal.ticker || "this stock";

  if (signal.premium) {
    const val = parsePremiumValue(signal.premium);
    if (val > 0) {
      parts.push(`Someone just spent ${signal.premium} betting ${direction} on ${ticker}. ${premiumColor(val)}.`);
    }
  }

  if (isSweep(signal)) {
    parts.push("This was a sweep — meaning the trader hit multiple exchanges at once to fill fast. That shows urgency and conviction.");
  }

  const aggMatch = desc.match(/(\d+)%?\s*(?:ask\s*)?aggress/i);
  if (aggMatch) {
    const pct = parseInt(aggMatch[1]);
    if (pct >= 90) {
      parts.push(`${pct}% aggression means they were buying at the ask aggressively — they didn't want to wait for a better price.`);
    } else if (pct >= 70) {
      parts.push(`${pct}% aggression — mostly buying at the ask. That's pretty aggressive.`);
    } else if (pct >= 50) {
      parts.push(`${pct}% aggression — decent but not super urgent.`);
    } else {
      parts.push(`${pct}% aggression — relatively passive buying. Could be hedging.`);
    }
  }

  if (parts.length === 0) return desc;
  return parts.join(" ");
}
