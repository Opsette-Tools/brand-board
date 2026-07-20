/*
 * Logo "safe chip" analysis.
 *
 * The hero band in every layout EXCEPT Poster is a solid brand-color wash. A
 * logo PNG with a transparent background and dark ink (a very common shape)
 * lands on that wash and its ink disappears. Poster is fine because its hero is
 * the paper color.
 *
 * The wrong fix is a hardcoded paper chip — it rescues a dark-ink transparent
 * logo but slaps an ugly box around a logo that already brings its own bright/
 * dark background. So we analyze the logo itself, ONCE at ingest, and decide:
 *
 *   - "none"  → the logo is mostly OPAQUE (brings its own backing). Render bare;
 *               it handles its own contrast on any hero.
 *   - "light" → transparent logo whose visible ink is DARK. Give it a light
 *               (paper) chip so the dark ink reads on a dark wash.
 *   - "dark"  → transparent logo whose visible ink is LIGHT (white-knockout /
 *               neon mark). Give it a dark chip so it reads on a light hero
 *               (e.g. the Poster paper hero, or a pale brand wash).
 *
 * The result is responsive to the LOGO, not the layout, so one shared CSS rule
 * covers all five layouts and future logos alike.
 */

export type LogoChip = "none" | "light" | "dark";

// Below this share of opaque pixels we treat the logo as transparent-backed
// (i.e. it will show the hero through it and needs a chip). A logo that fills
// most of its box with opaque pixels brings its own background.
const OPAQUE_COVERAGE_FOR_OWN_BG = 0.72;
// Alpha at/above this counts a pixel as "visible ink" for luminance sampling.
const INK_ALPHA = 128;

/**
 * Analyze a logo data URL and decide which safe chip (if any) it needs.
 * Runs on a downscaled offscreen canvas — cheap, and only at upload/import.
 * Returns "none" on any failure (SVG with no raster size, canvas taint, etc.)
 * so a logo is never worse off than bare.
 */
export function analyzeLogoChip(dataUrl: string): Promise<LogoChip> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        // Downscale to a small box — we only need coverage + average ink
        // luminance, not fidelity. Guard against 0-dimension SVGs.
        const w = 64;
        const h = Math.max(
          1,
          Math.round((img.naturalHeight / (img.naturalWidth || 1)) * w),
        );
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve("none");
        ctx.drawImage(img, 0, 0, w, h);

        const { data } = ctx.getImageData(0, 0, w, h);
        const total = w * h;
        let opaque = 0;
        let inkPixels = 0;
        let inkLumaSum = 0;

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a >= 250) opaque++;
          if (a >= INK_ALPHA) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // Perceived luminance (Rec. 601-ish), 0..255.
            inkLumaSum += 0.299 * r + 0.587 * g + 0.114 * b;
            inkPixels++;
          }
        }

        // Mostly opaque → the logo carries its own background. Leave it bare.
        if (opaque / total >= OPAQUE_COVERAGE_FOR_OWN_BG) return resolve("none");
        // No detectable ink (fully transparent / empty) → nothing to protect.
        if (inkPixels === 0) return resolve("none");

        const avgInkLuma = inkLumaSum / inkPixels;
        // Dark ink needs a LIGHT chip; light ink needs a DARK chip.
        resolve(avgInkLuma < 140 ? "light" : "dark");
      } catch {
        resolve("none");
      }
    };
    img.onerror = () => resolve("none");
    img.src = dataUrl;
  });
}
