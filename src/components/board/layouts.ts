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

export type LayoutId = "editorial" | "overlap" | "split" | "poster";

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
    blurb: "Signature & QR tiles overlap the color field. Layered, magazine feel.",
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
];

export const DEFAULT_LAYOUT: LayoutId = "editorial";

export function layoutClass(id: LayoutId): string {
  return `bb-layout-${id}`;
}
