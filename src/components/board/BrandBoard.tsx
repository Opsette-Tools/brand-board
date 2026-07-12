import { forwardRef, type CSSProperties, type ReactNode } from "react";
import type { BrandBoardData, PageId } from "./board.types";
import { blockPresence, pageBlocks, PAGE_META } from "./board.types";
import { layoutClass, type LayoutId } from "./layouts";
import "./board-template.css";

const OPSETTE_LOGO = `${import.meta.env.BASE_URL}opsette-logo.png`;

/** Rec. 601 luma → readable ink for text sitting on a color field. */
function readableInk(hex: string): string {
  let h = hex.replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (Number.isNaN(n) || h.length !== 6) return "#1a1714";
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#1a1714" : "#ffffff";
}

interface BrandPageProps {
  data: BrandBoardData;
  /** Which page this node renders. Its blocks are the page's slice of content. */
  page: PageId;
  /** Where this page sits in the SET (for the "01 / 03" counter). */
  pageNumber: number;
  totalPages: number;
}

/**
 * BrandPage — ONE fixed-size poster page (1600×2000) of the deliverable. It
 * renders the shared header + footer (so every page reads as one set) and only
 * the blocks that belong to `page`. Its layout comes from
 * data.pageLayouts[page], so each page composes independently. The forwarded
 * ref is what the exporter snapshots — one PNG per page.
 */
export const BrandPage = forwardRef<HTMLDivElement, BrandPageProps>(
  function BrandPage({ data, page, pageNumber, totalPages }, ref) {
    const present = blockPresence(data);
    const blocks = new Set(pageBlocks(page));
    const shows = (b: keyof typeof present) => blocks.has(b) && present[b];

    const layout: LayoutId = data.pageLayouts[page];
    const primary = data.colors[0]?.hex || "#2f4f46";
    const secondary = data.colors[1]?.hex || primary;
    const heroInk = readableInk(primary);

    const pageInk = readableInk(data.pageColor);
    const onLightPage = pageInk === "#1a1714";

    // The CTA/button color for the in-use mock: prefer a brand color the user
    // labeled Button/CTA/Primary/Accent; otherwise the most colorful (least
    // neutral) brand color; otherwise the palette primary.
    const ctaColor = (() => {
      const labeled = data.colors.find((c) =>
        /button|cta|primary|accent/i.test(c.label),
      );
      if (labeled) return labeled.hex;
      const spread = (hex: string) => {
        const n = parseInt(hex.replace("#", ""), 16);
        if (Number.isNaN(n)) return 0;
        const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        return Math.max(r, g, b) - Math.min(r, g, b);
      };
      const colorful = [...data.colors].sort((a, b) => spread(b.hex) - spread(a.hex))[0];
      return colorful?.hex || primary;
    })();

    const inkColor = data.roles?.heading ?? pageInk;
    const mutedColor =
      data.roles?.mutedText ?? (onLightPage ? "#8a8178" : "rgba(255,255,255,0.6)");
    const hairlineColor =
      data.roles?.border ?? (onLightPage ? "#e2dccf" : "rgba(255,255,255,0.18)");

    const pageStyle: CSSProperties = {
      ["--bb-primary" as string]: primary,
      ["--bb-secondary" as string]: secondary,
      ["--bb-hero-ink" as string]: heroInk,
      ["--bb-paper" as string]: data.pageColor,
      ["--bb-ink" as string]: inkColor,
      ["--bb-muted" as string]: mutedColor,
      ["--bb-hairline" as string]: hairlineColor,
      ["--bb-accent" as string]: primary,
      ["--bb-heading-font" as string]: `"${data.headingFont}"`,
      ["--bb-body-font" as string]: `"${data.bodyFont}"`,
    };

    const meta = PAGE_META[page];

    return (
      <div
        className={`bb-board bb-page bb-page-${page} ${layoutClass(layout)}`}
        ref={ref}
        style={pageStyle}
      >
        {/* ================= HERO / PAGE HEADER ================= */}
        <div className="bb-hero">
          <div className="bb-hero-top">
            <span className="bb-eyebrow">
              {meta.index} — {meta.title}
            </span>
            {data.logoDataUrl && (
              <div className="bb-logo-slot">
                <img src={data.logoDataUrl} alt="" />
              </div>
            )}
          </div>
          <div className="bb-hero-title">
            <h1 className="bb-hero-name">{data.kitName || "Your Brand"}</h1>
            {data.tagline.trim() && <p className="bb-hero-tagline">{data.tagline}</p>}
          </div>
        </div>

        {/* ================= BODY ================= */}
        <div className="bb-body">
          {shows("palette") && <PaletteBlock data={data} />}
          {shows("type") && <TypographyBlock data={data} />}
          {shows("context") && data.roles && (
            <ContextBlock data={data} ctaColor={ctaColor} readableInk={readableInk} />
          )}
          {shows("signature") && data.signatureHtml && (
            <SignatureBlock html={data.signatureHtml} />
          )}
          {shows("card") && data.cardDataUrl && <CardBlock src={data.cardDataUrl} />}
          {shows("qr") && data.qrDataUrl && <QrBlock src={data.qrDataUrl} />}
          {shows("social") && <SocialBlock data={data} />}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="bb-foot">
          <span className="bb-foot-text">
            {data.kitName ? `${data.kitName} — Brand Guide` : "Brand Guide"}
            {totalPages > 1 && (
              <span className="bb-foot-page">
                {" · "}
                {String(pageNumber).padStart(2, "0")} / {String(totalPages).padStart(2, "0")}
              </span>
            )}
          </span>
          <span className="bb-foot-mark">
            <img src={OPSETTE_LOGO} alt="" crossOrigin="anonymous" />
            Made with Opsette
          </span>
        </div>
      </div>
    );
  },
);

// ------------------------------------------------------------------ blocks ----

function Block({ label, className, children }: { label: string; className: string; children: ReactNode }) {
  return (
    <section className={`bb-block ${className}`}>
      <h2 className="bb-block-label">{label}</h2>
      {children}
    </section>
  );
}

function PaletteBlock({ data }: { data: BrandBoardData }) {
  return (
    <Block label="Palette" className="bb-block-palette">
      <div className="bb-swatches">
        {data.colors.map((c) => {
          const ink = readableInk(c.hex);
          return (
            <div key={c.id} className="bb-swatch" style={{ background: c.hex, color: ink }}>
              {c.label.trim() && <span className="bb-swatch-role">{c.label}</span>}
              <span className="bb-swatch-hex">{c.hex.toUpperCase()}</span>
            </div>
          );
        })}
      </div>
      {/* Tint/shade ramps are intentionally NOT shown on the board. They're a
          real deliverable, but the client gets them in their separate Palette
          Studio export; on this high-level one-page summary they cost the
          vertical room the In-Use mock needs. Data still rides along in the
          project file. */}
      {/* The semantic role strip used to render here too, but it duplicated the
          role colors the big labeled swatch cards above already show (a palette's
          brand colors ARE labeled with their roles). Showing both buried the
          In-Use mock off the fixed page. The big cards are the keeper; the role
          data still lives in the left panel + project file. */}
    </Block>
  );
}

function TypographyBlock({ data }: { data: BrandBoardData }) {
  return (
    <Block label="Typography" className="bb-block-type">
      <div className="bb-type-heading-block">
        <p className="bb-type-heading-sample">Aa</p>
        <div className="bb-type-heading-meta">
          <span className="bb-type-role">Heading</span>
          <span className="bb-type-name">{data.headingFont}</span>
        </div>
      </div>
      <div className="bb-type-body-block">
        <p className="bb-type-body-sample">
          The quick brown fox jumps over the lazy dog. Clean body copy sets the
          tone for every page and message the brand touches.
        </p>
        <div className="bb-type-body-meta">
          <span className="bb-type-role">Body</span>
          <span className="bb-type-name">{data.bodyFont}</span>
        </div>
      </div>
    </Block>
  );
}

function ContextBlock({
  data,
  ctaColor,
  readableInk,
}: {
  data: BrandBoardData;
  ctaColor: string;
  readableInk: (hex: string) => string;
}) {
  if (!data.roles) return null;
  return (
    <Block label="In Use" className="bb-block-context">
      <div
        className="bb-mock"
        style={{ background: data.roles.background, borderColor: data.roles.border }}
      >
        <div
          className="bb-mock-card"
          style={{ background: data.roles.surface, borderColor: data.roles.border }}
        >
          <span className="bb-mock-eyebrow" style={{ color: ctaColor }}>
            {data.kitName || "Your Brand"}
          </span>
          <h3 className="bb-mock-heading" style={{ color: data.roles.heading }}>
            A headline in your brand
          </h3>
          <p className="bb-mock-body" style={{ color: data.roles.text }}>
            Body copy sits on the surface color, easy to read. Muted text handles
            the quieter details below.
          </p>
          <p className="bb-mock-muted" style={{ color: data.roles.mutedText }}>
            Supporting caption · updated today
          </p>
          <span
            className="bb-mock-button"
            style={{ background: ctaColor, color: readableInk(ctaColor) }}
          >
            Primary action
          </span>
        </div>
      </div>
    </Block>
  );
}

/* Signature is injected INLINE (not an iframe): html-to-image cannot rasterize
   cross-frame iframe content. The signature HTML is fully self-contained, so
   inline injection renders faithfully and exports correctly. */
function SignatureBlock({ html }: { html: string }) {
  return (
    <Block label="Email Signature" className="bb-block-signature">
      <div className="bb-signature-frame">
        <div className="bb-signature-card">
          <div className="bb-signature-scaler">
            <div className="bb-signature-inner" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      </div>
    </Block>
  );
}

function CardBlock({ src }: { src: string }) {
  return (
    <Block label="Digital Card" className="bb-block-card">
      <div className="bb-card-tile">
        <img src={src} alt="digital card" />
      </div>
    </Block>
  );
}

function QrBlock({ src }: { src: string }) {
  return (
    <section className="bb-block bb-block-qr">
      <div className="bb-qr-tile">
        <img src={src} alt="qr code" />
      </div>
      <span className="bb-qr-caption">Scan</span>
    </section>
  );
}

function SocialBlock({ data }: { data: BrandBoardData }) {
  return (
    <Block label="Social & Brand Assets" className="bb-block-social">
      <div className="bb-social-grid">
        {data.socialAssets.map((a) => {
          const ratio = a.width && a.height ? a.width / a.height : 1;
          const wide = ratio >= 1.8;
          return (
            <div
              key={a.id}
              className={wide ? "bb-social-item bb-social-wide" : "bb-social-item"}
            >
              <div className="bb-social-frame">
                <img src={a.image} alt={a.label} />
              </div>
              {a.label && <span className="bb-social-label">{a.label}</span>}
            </div>
          );
        })}
      </div>
    </Block>
  );
}
