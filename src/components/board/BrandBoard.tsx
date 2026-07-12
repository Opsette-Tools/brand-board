import { forwardRef, type CSSProperties } from "react";
import type { BrandBoardData } from "./board.types";
import { blockPresence } from "./board.types";
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

interface BrandBoardProps {
  data: BrandBoardData;
  layout: LayoutId;
}

/**
 * BrandBoard — the designed deliverable, rendered at full intrinsic size.
 * Renders every block that has content; the chosen layout (a CSS class) decides
 * where each block sits, which overlap, and which bleed to the edge. The
 * forwarded ref is what the exporter snapshots.
 */
export const BrandBoard = forwardRef<HTMLDivElement, BrandBoardProps>(
  function BrandBoard({ data, layout }, ref) {
    const present = blockPresence(data);
    const primary = data.colors[0]?.hex || "#2f4f46";
    const secondary = data.colors[1]?.hex || primary;
    const heroInk = readableInk(primary);

    const pageInk = readableInk(data.pageColor);
    const onLightPage = pageInk === "#1a1714";

    // The CTA/button color for the in-use mock: prefer a brand color the user
    // labeled Button/CTA/Primary/Accent; otherwise the most colorful (least
    // neutral) brand color; otherwise the palette primary. NOT colors[0] blindly
    // — that may be the pale page background in a custom palette.
    const ctaColor = (() => {
      const labeled = data.colors.find((c) =>
        /button|cta|primary|accent/i.test(c.label),
      );
      if (labeled) return labeled.hex;
      // Most colorful = furthest from grey (max channel spread).
      const spread = (hex: string) => {
        const n = parseInt(hex.replace("#", ""), 16);
        if (Number.isNaN(n)) return 0;
        const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        return Math.max(r, g, b) - Math.min(r, g, b);
      };
      const colorful = [...data.colors].sort((a, b) => spread(b.hex) - spread(a.hex))[0];
      return colorful?.hex || primary;
    })();

    // When a palette provides role colors, the board adopts them for its own
    // type — the brand's name uses the brand's heading color, taglines/captions
    // use the muted color — so the guide reads as one coherent system, not
    // fixed neutrals. The HERO is exempt (it sits on the color field and needs
    // the contrast ink). Falls back to page-tone-derived neutrals otherwise.
    const inkColor = data.roles?.heading ?? pageInk;
    const mutedColor =
      data.roles?.mutedText ?? (onLightPage ? "#8a8178" : "rgba(255,255,255,0.6)");
    const hairlineColor =
      data.roles?.border ?? (onLightPage ? "#e2dccf" : "rgba(255,255,255,0.18)");

    const boardStyle: CSSProperties = {
      ["--bb-primary" as string]: primary,
      ["--bb-secondary" as string]: secondary,
      ["--bb-hero-ink" as string]: heroInk,
      ["--bb-paper" as string]: data.pageColor,
      ["--bb-ink" as string]: inkColor,
      ["--bb-muted" as string]: mutedColor,
      ["--bb-hairline" as string]: hairlineColor,
      // The brand's own accent for section labels / eyebrows, tying the page to
      // the palette. Defaults to muted when no palette is present.
      ["--bb-accent" as string]: primary,
      ["--bb-heading-font" as string]: `"${data.headingFont}"`,
      ["--bb-body-font" as string]: `"${data.bodyFont}"`,
    };

    return (
      <div className={`bb-board ${layoutClass(layout)}`} ref={ref} style={boardStyle}>
        {/* ================= HERO ================= */}
        <div className="bb-hero">
          <div className="bb-hero-top">
            <span className="bb-eyebrow">Brand Guide</span>
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
          {/* ---- Palette ---- */}
          {present.palette && (
            <section className="bb-block bb-block-palette">
              <h2 className="bb-block-label">Palette</h2>
              <div className="bb-swatches">
                {data.colors.map((c) => {
                  const ink = readableInk(c.hex);
                  return (
                    <div
                      key={c.id}
                      className="bb-swatch"
                      style={{ background: c.hex, color: ink }}
                    >
                      {c.label.trim() && <span className="bb-swatch-role">{c.label}</span>}
                      <span className="bb-swatch-hex">{c.hex.toUpperCase()}</span>
                    </div>
                  );
                })}
              </div>
              {/* Colors-in-context ramps, when provided by a palette payload. */}
              {data.ramps.length > 0 && (
                <div className="bb-ramps">
                  {data.ramps.map((ramp) => (
                    <div className="bb-ramp" key={ramp.baseHex}>
                      {ramp.stops.map((s) => (
                        <span
                          key={s.stop}
                          className="bb-ramp-cell"
                          style={{ background: s.hex }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Role colors: the functional palette, each with its hex, so a
                  client (and their developer) gets the WHOLE palette, not just
                  the 3 brand colors. Mirrors the left panel's Role colors. */}
              {data.roles && (
                <div className="bb-role-swatches">
                  {(
                    [
                      ["Page background", data.roles.background],
                      ["Card background", data.roles.surface],
                      ["Heading", data.roles.heading],
                      ["Body text", data.roles.text],
                      ["Muted text", data.roles.mutedText],
                      ["Border", data.roles.border],
                    ] as const
                  ).map(([label, hex]) => (
                    <div className="bb-role-swatch" key={label}>
                      <span
                        className="bb-role-chip"
                        style={{ background: hex, borderColor: data.roles!.border }}
                      />
                      <span className="bb-role-meta">
                        <span className="bb-role-name">{label}</span>
                        <span className="bb-role-hex">{hex.toUpperCase()}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ---- Typography ---- */}
          <section className="bb-block bb-block-type">
            <h2 className="bb-block-label">Typography</h2>
            <div className="bb-type-heading-block">
              <p className="bb-type-heading-sample">Aa</p>
              <div className="bb-type-heading-meta">
                <span className="bb-type-role">Heading</span>
                <span className="bb-type-name">{data.headingFont}</span>
              </div>
            </div>
            <div className="bb-type-body-block">
              <p className="bb-type-body-sample">
                The quick brown fox jumps over the lazy dog. Clean body copy sets
                the tone for every page and message the brand touches.
              </p>
              <div className="bb-type-body-meta">
                <span className="bb-type-role">Body</span>
                <span className="bb-type-name">{data.bodyFont}</span>
              </div>
            </div>
          </section>

          {/* ---- In context: a mini mock page built from the six roles ---- */}
          {present.context && data.roles && (
            <section className="bb-block bb-block-context">
              <h2 className="bb-block-label">In Use</h2>
              <div
                className="bb-mock"
                style={{
                  background: data.roles.background,
                  borderColor: data.roles.border,
                }}
              >
                <div
                  className="bb-mock-card"
                  style={{
                    background: data.roles.surface,
                    borderColor: data.roles.border,
                  }}
                >
                  <span
                    className="bb-mock-eyebrow"
                    style={{ color: ctaColor }}
                  >
                    {data.kitName || "Your Brand"}
                  </span>
                  <h3 className="bb-mock-heading" style={{ color: data.roles.heading }}>
                    A headline in your brand
                  </h3>
                  <p className="bb-mock-body" style={{ color: data.roles.text }}>
                    Body copy sits on the surface color, easy to read. Muted text
                    handles the quieter details below.
                  </p>
                  <p className="bb-mock-muted" style={{ color: data.roles.mutedText }}>
                    Supporting caption · updated today
                  </p>
                  <span
                    className="bb-mock-button"
                    style={{
                      background: ctaColor,
                      color: readableInk(ctaColor),
                    }}
                  >
                    Primary action
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* ---- Signature ----
              Injected INLINE (not an iframe): html-to-image cannot rasterize
              cross-frame iframe content, so an iframe would export blank. The
              signature HTML is fully self-contained (inline styles, data-URI
              icons/logo — verified), so inline injection renders faithfully and
              exports correctly. The .bb-signature-frame wrapper resets inherited
              type so the email HTML controls its own look. */}
          {present.signature && data.signatureHtml && (
            <section className="bb-block bb-block-signature">
              <h2 className="bb-block-label">Email Signature</h2>
              <div className="bb-signature-frame">
                <div className="bb-signature-card">
                  {/* Scale the native ~500px email signature up to poster size.
                      The sizing box reserves the SCALED footprint (native size ×
                      scale) so the white card wraps it instead of clipping. */}
                  <div className="bb-signature-scaler">
                    <div
                      className="bb-signature-inner"
                      dangerouslySetInnerHTML={{ __html: data.signatureHtml }}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ---- Digital card (uploaded preview) ---- */}
          {present.card && data.cardDataUrl && (
            <section className="bb-block bb-block-card">
              <h2 className="bb-block-label">Digital Card</h2>
              <div className="bb-card-tile">
                <img src={data.cardDataUrl} alt="digital card" />
              </div>
            </section>
          )}

          {/* ---- QR (uploaded, small overlapping tile) ---- */}
          {present.qr && data.qrDataUrl && (
            <section className="bb-block bb-block-qr">
              <div className="bb-qr-tile">
                <img src={data.qrDataUrl} alt="qr code" />
              </div>
              <span className="bb-qr-caption">Scan</span>
            </section>
          )}

          {/* ---- Social / brand assets (banners, avatar, favicon...) ---- */}
          {present.social && (
            <section className="bb-block bb-block-social">
              <h2 className="bb-block-label">Social & Brand Assets</h2>
              <div className="bb-social-grid">
                {data.socialAssets.map((a) => {
                  // Wide images (banners) span the row; near-square ones (avatar,
                  // favicon, icon) sit compact. Ratio drives the layout, no
                  // per-type logic needed.
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
            </section>
          )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="bb-foot">
          <span className="bb-foot-text">
            {data.kitName ? `${data.kitName} — Brand Guide` : "Brand Guide"}
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
