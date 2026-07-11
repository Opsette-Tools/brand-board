// The CONSUMER side of the Brand Kit Interop Contract. Parses the JSON payloads
// the other Opsette tools emit (see docs/BRAND-KIT-INTEROP-CONTRACT.md) into
// Brand Board's state. Tolerant: accepts the exact contract shape, and falls
// back to lenient parsing so a partial/hand-built blob still lands.

import type { BrandBoardData, BrandColor, ColorRamp } from "./board.types";
import { MAX_COLORS } from "./board.types";
import { FONT_PAIRINGS } from "@/lib/fonts";
import { uuid } from "@/lib/uuid";

function safeParse(input: string): unknown {
  try {
    return JSON.parse(input.trim());
  } catch {
    return null;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normHex(h: unknown): string | null {
  if (typeof h !== "string") return null;
  const m = h.trim().match(/^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
  if (!m) return null;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  return "#" + hex.toUpperCase();
}

/**
 * Ingest a Palette Studio "palette" payload. Returns a NEW board with colors,
 * ramps, fonts, and (if empty) the kit name filled in. Null if unrecognizable.
 */
export function ingestPalettePayload(
  input: string,
  current: BrandBoardData,
): BrandBoardData | null {
  const raw = safeParse(input);
  if (!isRecord(raw)) return null;

  // Accept either the enveloped contract shape or a bare palette object.
  const data = isRecord(raw.data) ? raw.data : raw;
  if (raw.type && raw.type !== "palette") return null;

  // Ordered named colors → labeled swatches.
  const named: { hex: unknown; label: string }[] = [
    { hex: data.primary, label: "Primary" },
    { hex: data.secondary, label: "Secondary" },
    { hex: data.accent, label: "Accent" },
    { hex: data.accent2, label: "Accent 2" },
  ];
  // In custom mode, prefer the user's own colors + names.
  if (Array.isArray(data.custom) && data.custom.length > 0) {
    named.length = 0;
    for (const c of data.custom as unknown[]) {
      if (isRecord(c)) {
        named.push({ hex: c.hex, label: typeof c.name === "string" && c.name ? c.name : String(c.role ?? "") });
      }
    }
  }

  const colors: BrandColor[] = [];
  for (const n of named) {
    const hex = normHex(n.hex);
    if (hex && colors.length < MAX_COLORS) {
      colors.push({ id: uuid(), hex, label: n.label });
    }
  }
  if (colors.length === 0) return null;

  // Ramps from the scales, for "colors in context".
  const ramps: ColorRamp[] = [];
  const scales = isRecord(data.scales) ? data.scales : undefined;
  if (scales) {
    for (const key of ["primary", "accent", "neutral"] as const) {
      const scale = scales[key];
      if (isRecord(scale)) {
        const stops = ["100", "300", "500", "700", "900"]
          .map((stop) => ({ stop, hex: normHex(scale[stop]) }))
          .filter((s): s is { stop: string; hex: string } => s.hex !== null);
        if (stops.length > 0) ramps.push({ baseHex: stops[Math.floor(stops.length / 2)].hex, stops });
      }
    }
  }

  // Fonts: map to a known pairing if possible, else take the raw families.
  let headingFont = current.headingFont;
  let bodyFont = current.bodyFont;
  const font = isRecord(data.font) ? data.font : undefined;
  if (font) {
    if (typeof font.heading === "string" && font.heading) headingFont = font.heading;
    if (typeof font.body === "string" && font.body) bodyFont = font.body;
  }

  const kitName =
    current.kitName || (typeof data.kitName === "string" ? data.kitName : current.kitName);

  return { ...current, colors, ramps, headingFont, bodyFont, kitName };
}

/**
 * Ingest a Signature Studio "signature" payload → the self-contained HTML string
 * for the iframe tile. Accepts the enveloped shape or a bare { html } object.
 */
export function ingestSignaturePayload(input: string): string | null {
  const raw = safeParse(input);
  if (!isRecord(raw)) return null;
  if (raw.type && raw.type !== "signature") return null;
  const data = isRecord(raw.data) ? raw.data : raw;
  if (typeof data.html === "string" && data.html.trim().length > 0) {
    return data.html;
  }
  return null;
}

// Re-export for convenience: the known font families a pairing might name, so
// the app can lazy-load whatever a payload brings even if it's not a preset.
export function fontFamiliesFrom(headingFont: string, bodyFont: string): string[] {
  const known = new Set(FONT_PAIRINGS.flatMap((p) => [p.headingFont, p.bodyFont]));
  const out = [headingFont, bodyFont];
  // (No-op today; hook for future validation against `known`.)
  void known;
  return out;
}
