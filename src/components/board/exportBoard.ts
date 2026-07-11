import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { waitForFonts } from "@/lib/fonts";

// The board's intrinsic WIDTH (must match --bb-w in board-template.css). The
// height is dynamic — the board grows to fit its content — so the exporter
// measures the node rather than assuming a fixed height. BOARD_H is the minimum
// (poster proportion) used for the preview's initial reservation.
export const BOARD_W = 1600;
export const BOARD_H = 2000;
const EXPORT_SCALE = 2;

/**
 * Rasterize the board node to a PNG data URL at export resolution.
 *
 * The board renders at its intrinsic WIDTH and grows in height to fit content,
 * so we snapshot at the node's REAL measured height (not a fixed value) to
 * capture the whole board with nothing clipped.
 */
export async function boardToPngDataUrl(
  node: HTMLElement,
  fontFamilies: string[],
): Promise<string> {
  // Make sure the chosen faces are painted before we snapshot, or the raster
  // captures a fallback font.
  await waitForFonts(fontFamilies);

  const height = Math.max(node.scrollHeight, BOARD_H);

  return toPng(node, {
    width: BOARD_W,
    height,
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

  // Portrait PDF sized to the board's REAL aspect ratio (height is dynamic), so
  // the PDF looks identical to the PNG — full-bleed, no margins, no clipping.
  const height = Math.max(node.scrollHeight, BOARD_H);
  const pdfW = 612;
  const pdfH = (height / BOARD_W) * pdfW;
  const doc = new jsPDF({ unit: "pt", format: [pdfW, pdfH], orientation: "portrait" });
  doc.addImage(png, "PNG", 0, 0, pdfW, pdfH, undefined, "FAST");
  return doc.output("blob");
}
