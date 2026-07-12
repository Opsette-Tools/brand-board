import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { waitForFonts } from "@/lib/fonts";

// Each page renders at a FIXED intrinsic size (1600×2000, 4:5 portrait) so the
// exported set is a run of uniform, gallery-ready posters. The fixed height is
// the export height — pages are sized to fit their frame, not to grow.
export const BOARD_W = 1600;
export const BOARD_H = 2000;
const EXPORT_SCALE = 2;

/**
 * Rasterize one page node to a PNG data URL at export resolution. The page is a
 * fixed 1600×2000 poster, snapshotted at that exact size so every page in the
 * set matches.
 */
export async function pageToPngDataUrl(
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

export async function pageToPngBlob(
  node: HTMLElement,
  fontFamilies: string[],
): Promise<Blob> {
  return dataUrlToBlob(await pageToPngDataUrl(node, fontFamilies));
}

/**
 * Rasterize a set of page nodes to PNG blobs — one per page. The caller names
 * and downloads each (e.g. kit-01-foundation.png). Rendered sequentially so a
 * heavy board doesn't fire N simultaneous rasterizations.
 */
export async function pagesToPngBlobs(
  nodes: HTMLElement[],
  fontFamilies: string[],
): Promise<Blob[]> {
  const out: Blob[] = [];
  for (const node of nodes) {
    out.push(await pageToPngBlob(node, fontFamilies));
  }
  return out;
}

/**
 * Assemble a multi-page PDF — one board page per PDF page — so a client gets the
 * whole kit as one hand-off document. Every page is the same fixed proportion,
 * full-bleed, no margins, matching the PNGs exactly.
 */
export async function pagesToPdfBlob(
  nodes: HTMLElement[],
  fontFamilies: string[],
): Promise<Blob> {
  const pdfW = 612;
  const pdfH = (BOARD_H / BOARD_W) * pdfW;
  const doc = new jsPDF({ unit: "pt", format: [pdfW, pdfH], orientation: "portrait" });

  for (let i = 0; i < nodes.length; i++) {
    const png = await pageToPngDataUrl(nodes[i], fontFamilies);
    if (i > 0) doc.addPage([pdfW, pdfH], "portrait");
    doc.addImage(png, "PNG", 0, 0, pdfW, pdfH, undefined, "FAST");
  }
  return doc.output("blob");
}
