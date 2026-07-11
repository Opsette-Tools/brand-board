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

    const boardStyle: CSSProperties = {
      ["--bb-primary" as string]: primary,
      ["--bb-secondary" as string]: secondary,
      ["--bb-hero-ink" as string]: heroInk,
      ["--bb-paper" as string]: data.pageColor,
      ["--bb-ink" as string]: pageInk,
      // Muted + hairline derived from the page tone so they read correctly on
      // white, bone, or a dark page.
      ["--bb-muted" as string]: onLightPage ? "#8a8178" : "rgba(255,255,255,0.6)",
      ["--bb-hairline" as string]: onLightPage ? "#e2dccf" : "rgba(255,255,255,0.18)",
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
                    style={{ color: data.colors[0]?.hex || data.roles.heading }}
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
                      background: data.colors[0]?.hex || data.roles.heading,
                      color: readableInk(data.colors[0]?.hex || data.roles.heading),
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
                <div
                  className="bb-signature-inner"
                  dangerouslySetInnerHTML={{ __html: data.signatureHtml }}
                />
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
