// The data model for a brand board. Brand Board is a CONSUMER: it holds the
// assets a user pastes/uploads from the other Opsette tools (per
// BRAND-KIT-INTEROP-CONTRACT.md) and composes them into one designed page.
//
// The board is a set of BLOCKS (hero, palette, type, signature, qr, card, logo)
// arranged by a chosen LAYOUT. A block only renders when its content is present,
// so a kit with no signature simply omits that block — no empty holes.

export interface BrandColor {
  id: string;
  /** Hex including leading "#", uppercase, e.g. "#2F4F46". */
  hex: string;
  /** Role/label, e.g. "Primary". Comes pre-labeled from Palette Studio. */
  label: string;
}

/** A tint→shade ramp for a single brand color (shows colors "in context"). */
export interface ColorRamp {
  baseHex: string;
  stops: { stop: string; hex: string }[];
}

export interface BrandBoardData {
  kitName: string;
  tagline: string;
  /** The board's page/paper background. Defaults to a warm bone; white is common. */
  pageColor: string;

  // ---- Colors (from Palette Studio payload, or entered by hand) ----
  colors: BrandColor[];
  /** Optional per-color ramps, when a palette payload provides scales. */
  ramps: ColorRamp[];

  // ---- Type (from Palette Studio payload, or picked here) ----
  headingFont: string;
  bodyFont: string;

  // ---- Logo (uploaded — source logo or icon-512.png) ----
  logoDataUrl: string | null;
  logoWidth: number | null;
  logoHeight: number | null;

  // ---- Signature (from Signature Studio payload) ----
  /** Self-contained email HTML, rendered in a sandboxed iframe tile. */
  signatureHtml: string | null;

  // ---- QR (uploaded PNG/SVG from QR Creator) ----
  qrDataUrl: string | null;

  // ---- Digital card (uploaded PNG from Digital Card) ----
  cardDataUrl: string | null;
}

export const MAX_COLORS = 6;

export function emptyBoard(): BrandBoardData {
  return {
    kitName: "",
    tagline: "",
    pageColor: "#F6F3EC",
    colors: [],
    ramps: [],
    headingFont: "Playfair Display",
    bodyFont: "Inter",
    logoDataUrl: null,
    logoWidth: null,
    logoHeight: null,
    signatureHtml: null,
    qrDataUrl: null,
    cardDataUrl: null,
  };
}

/** Which optional blocks currently have content — drives layout composition. */
export interface BlockPresence {
  hero: boolean; // always true (kitName / logo / tagline)
  palette: boolean;
  type: boolean; // always true (fonts always set)
  signature: boolean;
  qr: boolean;
  card: boolean;
}

export function blockPresence(b: BrandBoardData): BlockPresence {
  return {
    hero: true,
    palette: b.colors.length > 0,
    type: true,
    signature: b.signatureHtml !== null,
    qr: b.qrDataUrl !== null,
    card: b.cardDataUrl !== null,
  };
}

export function boardHasContent(b: BrandBoardData): boolean {
  return (
    b.kitName.trim().length > 0 ||
    b.colors.length > 0 ||
    b.logoDataUrl !== null ||
    b.signatureHtml !== null ||
    b.qrDataUrl !== null ||
    b.cardDataUrl !== null
  );
}
