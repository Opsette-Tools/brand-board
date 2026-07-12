// Board layouts — the "wireframes". Each layout is a named composition that
// arranges the same blocks (hero, palette, type, signature, qr, card) into a
// distinct designed page. Layouts intentionally break the grid: full-bleed
// color fields, overlapping tiles, asymmetric splits — so a board reads as
// "designed in Canva", not "fields in a table".
//
// A layout is expressed as a CSS-class modifier on the board root; the actual
// positioning lives in board-template.css under `.bb-board.bb-layout-<id>`.
// This keeps the composition in CSS (where overlap/bleed is natural) while the
// React tree just renders every present block once.

import type { PageId } from "./board.types";

export type LayoutId = "editorial" | "overlap" | "split" | "poster" | "stack";

export interface BoardLayout {
  id: LayoutId;
  name: string;
  /** One-line description of the composition, shown in the picker. */
  blurb: string;
}

export const LAYOUTS: BoardLayout[] = [
  {
    id: "editorial",
    name: "Editorial",
    blurb: "Full-bleed color header, clean stacked sections. Calm and premium.",
  },
  {
    id: "overlap",
    name: "Overlap",
    blurb: "The palette pulls up and layers over the color field. Magazine feel.",
  },
  {
    id: "split",
    name: "Split",
    blurb: "Vertical color band down one side, assets stacked beside it.",
  },
  {
    id: "poster",
    name: "Poster",
    blurb: "Oversized wordmark hero, palette as a full-width color bar.",
  },
  {
    id: "stack",
    name: "Stacked",
    blurb: "Clean color header, assets stacked in tidy sections.",
  },
];

export const DEFAULT_LAYOUT: LayoutId = "editorial";

export function layoutClass(id: LayoutId): string {
  return `bb-layout-${id}`;
}

/**
 * Which layouts each page offers. Foundation (colors + type) is the page where
 * composed layouts actually pay off, so it gets the full set. Applications and
 * Social currently only stack cleanly — they expose Stacked alone until they
 * earn their own real layouts. New per-page layouts are added here.
 */
const FOUNDATION_LAYOUTS: LayoutId[] = ["overlap", "editorial", "split", "poster", "stack"];
const SIMPLE_LAYOUTS: LayoutId[] = ["stack"];

export function layoutsForPage(page: PageId): BoardLayout[] {
  const ids = page === "foundation" ? FOUNDATION_LAYOUTS : SIMPLE_LAYOUTS;
  return ids.map((id) => LAYOUTS.find((l) => l.id === id)!);
}
