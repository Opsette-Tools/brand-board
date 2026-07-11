// The Brand Board Project File — the durable, per-client archive.
//
// Brand Board is the one place that holds a client's WHOLE kit (palette,
// signature, QR, card, logo, layout, name/tagline). "Save Project" downloads
// all of it as a single .json a user keeps in their own file system
// (Clients/Acme/acme.opsette-kit.json). "Open Project" rehydrates the board
// from that file — so a revision three weeks later is: open the file, edit,
// re-export. No backend, one portable file per client, survives browser wipes.
//
// This is the file-system alternative to relying on per-app localStorage, and
// the same JSON shape becomes DB rows if a backend is ever added.

import type { BrandBoardData } from "./board.types";
import { emptyBoard } from "./board.types";
import type { LayoutId } from "./layouts";

const PROJECT_TYPE = "opsette-brand-board-project";

export interface BrandBoardProjectFile {
  type: typeof PROJECT_TYPE;
  v: 1;
  savedAt: string; // ISO timestamp, stamped at save time
  layout: LayoutId;
  board: BrandBoardData;
}

export function serializeProject(
  board: BrandBoardData,
  layout: LayoutId,
  savedAtIso: string,
): string {
  const file: BrandBoardProjectFile = {
    type: PROJECT_TYPE,
    v: 1,
    savedAt: savedAtIso,
    layout,
    board,
  };
  return JSON.stringify(file, null, 2);
}

export interface LoadedProject {
  board: BrandBoardData;
  layout: LayoutId;
}

/** Parse a project file's text. Null if it isn't a Brand Board project. */
export function parseProject(text: string): LoadedProject | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (r.type !== PROJECT_TYPE) return null;
  if (typeof r.board !== "object" || r.board === null) return null;

  // Merge onto a fresh empty board so a file saved by an older version (missing
  // newer fields) still loads with sensible defaults.
  const board: BrandBoardData = { ...emptyBoard(), ...(r.board as Partial<BrandBoardData>) };
  const layout = (typeof r.layout === "string" ? r.layout : "editorial") as LayoutId;
  return { board, layout };
}

export function projectFileName(kitName: string): string {
  const safe = (kitName || "brand-kit").replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
  return `${safe}.opsette-kit.json`;
}
