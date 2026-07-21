// The Mechanism 3 embed registry: one entry per tool Brand Board can host in the
// ToolEmbedDrawer. Each entry knows its route slug + dev port, a display title,
// how to read the board's CURRENT blob for that tool (to hand down on load), and
// how to APPLY a revised blob back onto the board (reusing the existing ingest
// paths from ingest.ts — nothing about the JSON shapes changes).
//
// Adding a tool to the drawer = one entry here + one <ToolEmbedDrawer> render.

import type { BrandBoardData } from "./board.types";
import {
  ingestPalettePayload,
  ingestSignaturePayload,
  ingestQrPayload,
  ingestCardPayload,
  ingestSocialPayload,
} from "./ingest";

export type EmbedToolKey = "palette" | "signature" | "qr" | "card" | "social" | "banner";

export interface EmbedToolDef {
  key: EmbedToolKey;
  slug: string;
  /** Local dev port (DEV_SERVERS.md) — used only on localhost. */
  localPort: number;
  title: string;
  /** Default drawer width; Icon Kit's Social assets want more room. */
  defaultWidth: number;
  /** The board's current stored blob for this tool, or null (→ fresh canvas). */
  currentBlob: (data: BrandBoardData) => string | null;
  /** Fold a revised blob back onto the board. Returns the next board, or null if
   *  the blob didn't parse (the caller surfaces a friendly error). */
  apply: (revisedBlob: string, data: BrandBoardData) => BrandBoardData | null;
}

export const EMBED_TOOLS: Record<EmbedToolKey, EmbedToolDef> = {
  palette: {
    key: "palette",
    slug: "palette-studio",
    localPort: 8117,
    title: "Palette Studio",
    defaultWidth: 620,
    currentBlob: (d) => d.sourceBlobs.palette ?? null,
    apply: (raw, data) => {
      const next = ingestPalettePayload(raw, data);
      if (!next) return null;
      return { ...next, sourceBlobs: { ...next.sourceBlobs, palette: raw.trim() } };
    },
  },
  signature: {
    key: "signature",
    slug: "signature-studio",
    localPort: 8114,
    title: "Signature Studio",
    defaultWidth: 720,
    currentBlob: (d) => d.sourceBlobs.signature ?? null,
    apply: (raw, data) => {
      const html = ingestSignaturePayload(raw);
      if (!html) return null;
      return {
        ...data,
        signatureHtml: html,
        sourceBlobs: { ...data.sourceBlobs, signature: raw.trim() },
      };
    },
  },
  qr: {
    key: "qr",
    slug: "qr-creator",
    localPort: 8108,
    title: "QR Creator",
    defaultWidth: 620,
    currentBlob: (d) => d.sourceBlobs.qr ?? null,
    apply: (raw, data) => {
      const { image, ok } = ingestQrPayload(raw);
      if (!ok) return null;
      return {
        ...data,
        qrDataUrl: image ?? data.qrDataUrl,
        sourceBlobs: { ...data.sourceBlobs, qr: raw.trim() },
      };
    },
  },
  card: {
    key: "card",
    slug: "digital-card",
    localPort: 8104,
    title: "Digital Card",
    defaultWidth: 680,
    currentBlob: (d) => d.sourceBlobs.card ?? null,
    apply: (raw, data) => {
      const { image, vcard, qr, ok } = ingestCardPayload(raw);
      if (!ok) return null;
      return {
        ...data,
        cardDataUrl: image ?? data.cardDataUrl,
        cardVcardDataUrl: vcard ?? null,
        cardQrDataUrl: qr ?? null,
        sourceBlobs: { ...data.sourceBlobs, card: raw.trim() },
      };
    },
  },
  social: {
    key: "social",
    slug: "icon-kit",
    localPort: 8118,
    title: "Icon Kit",
    // Icon Kit's Social/banner UI is the widest — give it the most room by default.
    defaultWidth: 900,
    currentBlob: (d) => d.sourceBlobs.social ?? null,
    apply: (raw, data) => {
      const { assets, ok } = ingestSocialPayload(raw);
      if (!ok) return null;
      return {
        ...data,
        socialAssets: assets,
        sourceBlobs: { ...data.sourceBlobs, social: raw.trim() },
      };
    },
  },
  banner: {
    key: "banner",
    slug: "banner-designer",
    localPort: 8126,
    title: "Banner Designer",
    // A wide banner builder, like Icon Kit's old social tab — same generous width.
    defaultWidth: 900,
    currentBlob: (d) => d.sourceBlobs.banner ?? null,
    // Banner Designer emits the SAME type:"social" blob shape as Icon Kit, so it
    // reuses the same ingest — but its output is stored in its OWN slot
    // (bannerAssets / sourceBlobs.banner), NEVER socialAssets. This separation is
    // the entire reason this entry exists: pasting a banner must not clobber Icon
    // Kit's social assets, and vice versa.
    apply: (raw, data) => {
      const { assets, ok } = ingestSocialPayload(raw);
      if (!ok) return null;
      return {
        ...data,
        bannerAssets: assets,
        sourceBlobs: { ...data.sourceBlobs, banner: raw.trim() },
      };
    },
  },
};
