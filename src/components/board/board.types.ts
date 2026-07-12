import type { LayoutId } from "./layouts";

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

/**
 * A single labeled brand image from Icon Kit — a social banner, avatar, favicon,
 * app icon, anything. Fully generic: the board just renders the image at (or
 * scaled from) its natural dimensions and shows the label. `kind` is an optional
 * grouping/sizing hint, not required.
 */
export interface SocialAsset {
  id: string;
  label: string;
  kind?: string; // "banner" | "avatar" | "favicon" | "icon" | ... (hint only)
  image: string; // data URL
  width?: number;
  height?: number;
}

/**
 * The six semantic role colors (from Palette Studio's `roles`). These drive the
 * "in-context" mini mock composition on the board — a real page built from the
 * palette, not just swatches. Null when no palette with roles has been imported.
 */
export interface BrandRoles {
  background: string;
  surface: string;
  text: string;
  heading: string;
  mutedText: string;
  border: string;
}

/**
 * The board is a multi-PAGE deliverable. Each page is its own fixed-size poster
 * with its own layout setting:
 *   - foundation   → colors + fonts (palette, ramps, roles, type, in-use mock)
 *   - applications → email signature, QR, digital card
 *   - social       → social banners, avatar, favicon, brand assets
 * A page only appears when it has content, so a minimal kit is a single page.
 */
export type PageId = "foundation" | "applications" | "social";

export const PAGE_ORDER: PageId[] = ["foundation", "applications", "social"];

export const PAGE_META: Record<PageId, { index: string; title: string }> = {
  foundation: { index: "01", title: "Foundation" },
  applications: { index: "02", title: "Applications" },
  social: { index: "03", title: "Social & Assets" },
};

export interface BrandBoardData {
  kitName: string;
  tagline: string;
  /** The board's page/paper background. Defaults to a warm bone; white is common. */
  pageColor: string;

  // ---- Colors (from Palette Studio payload, or entered by hand) ----
  colors: BrandColor[];
  /** Optional per-color ramps, when a palette payload provides scales. */
  ramps: ColorRamp[];
  /** The six semantic roles, when a palette payload provides them. */
  roles: BrandRoles | null;

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

  // ---- Social / brand assets (from Icon Kit) ----
  // A generic, open-ended list of labeled images: social banners (any platform),
  // profile avatar, favicon, app icons — whatever Icon Kit produces. The board
  // renders each by its natural size; no per-type logic needed.
  socialAssets: SocialAsset[];

  // ---- Source blobs ----
  // The exact JSON blobs the user imported, kept so they can be re-copied back
  // out anytime and are archived in the project file / localStorage draft. This
  // is what makes import non-destructive: the original data is never lost, even
  // after the paste field is cleared.
  sourceBlobs: {
    palette: string | null;
    signature: string | null;
    qr: string | null;
    card: string | null;
    social: string | null;
  };

  // ---- Per-page layout ----
  // Each page owns its own layout so a killer Foundation layout (Overlap) can
  // differ from the plainer Applications/Social pages — and new per-page layouts
  // slot in here without touching the rest of the app.
  pageLayouts: Record<PageId, LayoutId>;
}

// A brand board shows the brand's actual palette colors. In custom ("my own
// colors") mode a user may define many — show them all, not a curated few. The
// cap is a sanity bound, not a design limit; the swatch row wraps past ~6.
export const MAX_COLORS = 12;

export function emptyBoard(): BrandBoardData {
  return {
    kitName: "",
    tagline: "",
    pageColor: "#F6F3EC",
    colors: [],
    ramps: [],
    roles: null,
    headingFont: "Playfair Display",
    bodyFont: "Inter",
    logoDataUrl: null,
    logoWidth: null,
    logoHeight: null,
    signatureHtml: null,
    qrDataUrl: null,
    cardDataUrl: null,
    socialAssets: [],
    sourceBlobs: { palette: null, signature: null, qr: null, card: null, social: null },
    pageLayouts: {
      // Overlap is the one layout that genuinely composes (it layers the palette)
      // — make it the Foundation default. The other pages stack until they earn
      // their own real layouts.
      foundation: "overlap",
      applications: "stack",
      social: "stack",
    },
  };
}

/** Which optional blocks currently have content — drives layout composition. */
export interface BlockPresence {
  hero: boolean; // always true (kitName / logo / tagline)
  palette: boolean;
  type: boolean; // always true (fonts always set)
  context: boolean; // the in-context mini mock (needs roles)
  signature: boolean;
  qr: boolean;
  card: boolean;
  social: boolean;
}

export function blockPresence(b: BrandBoardData): BlockPresence {
  return {
    hero: true,
    palette: b.colors.length > 0,
    type: true,
    context: b.roles !== null,
    signature: b.signatureHtml !== null,
    qr: b.qrDataUrl !== null,
    card: b.cardDataUrl !== null,
    social: b.socialAssets.length > 0,
  };
}

/**
 * Which pages have content, in canonical order. Foundation is always present
 * (type + hero always exist); Applications appears with a signature/QR/card;
 * Social appears with any social/brand asset. A minimal kit is one page.
 */
export function presentPages(b: BrandBoardData): PageId[] {
  const p = blockPresence(b);
  const pages: PageId[] = ["foundation"]; // always — palette/type/hero live here
  if (p.signature || p.qr || p.card) pages.push("applications");
  if (p.social) pages.push("social");
  return pages;
}

/** The blocks that belong to each page (used by BrandPage to render its slice). */
export function pageBlocks(page: PageId): (keyof BlockPresence)[] {
  switch (page) {
    case "foundation":
      return ["palette", "type", "context"];
    case "applications":
      return ["signature", "qr", "card"];
    case "social":
      return ["social"];
  }
}

export function boardHasContent(b: BrandBoardData): boolean {
  return (
    b.kitName.trim().length > 0 ||
    b.colors.length > 0 ||
    b.logoDataUrl !== null ||
    b.signatureHtml !== null ||
    b.qrDataUrl !== null ||
    b.cardDataUrl !== null ||
    b.socialAssets.length > 0
  );
}
