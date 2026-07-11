import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { waitForFonts } from "@/lib/fonts";

// The board's intrinsic pixel size (must match --bb-w / --bb-h in
// board-template.css). We export at 2x this for a crisp, print-grade PNG.
export const BOARD_W = 1600;
export const BOARD_H = 2000;
const EXPORT_SCALE = 2;

/**
 * Rasterize the board node to a PNG data URL at export resolution.
 *
 * The node is rendered at its intrinsic size (it may be visually scaled down in
 * the preview via a transform on a *wrapper*, but the node itself is full-size),
 * so we pass explicit width/height and a pixelRatio to get a 3200x4000 image.
 */
export async function boardToPngDataUrl(
  node: HTMLElement,
  fontFamilies: string[],
): Promise<string> {
  // Make sure the chosen faces are painted before we snapshot, or the raster
  // captures a fallback font.
  await waitForFonts(fontFamilies);

  return toPng(node, {
    width: BOARD_W,
    height: BOARD_H,
    pixelRatio: EXPORT_SCALE,
    cacheBust: true,
    // Neutralize any inherited transform so the snapshot is 1:1 at full size
    // regardless of how the preview wrapper scales it on screen.
    style: {
      transform: "none",
      transformOrigin: "top left",
      margin: "0",
    },
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mime = head.match(/:(.*?);/)?.[1] ?? "image/png";
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

export async function boardToPngBlob(
  node: HTMLElement,
  fontFamilies: string[],
): Promise<Blob> {
  return dataUrlToBlob(await boardToPngDataUrl(node, fontFamilies));
}

/**
 * Wrap the rendered board image in a portrait PDF at the same aspect ratio, so
 * the PDF looks identical to the PNG — full-bleed, no margins.
 */
export async function boardToPdfBlob(
  node: HTMLElement,
  fontFamilies: string[],
): Promise<Blob> {
  const png = await boardToPngDataUrl(node, fontFamilies);

  // Portrait PDF sized to the board's aspect ratio in points. Letter-ish width
  // (612pt) scaled to the 4:5 board so the image fills the page exactly.
  const pdfW = 612;
  const pdfH = (BOARD_H / BOARD_W) * pdfW; // 765pt
  const doc = new jsPDF({ unit: "pt", format: [pdfW, pdfH], orientation: "portrait" });
  doc.addImage(png, "PNG", 0, 0, pdfW, pdfH, undefined, "FAST");
  return doc.output("blob");
}
