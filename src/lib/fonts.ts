// Curated font pairings for the brand board. Each pairing names a heading and
// body family available on Google Fonts. This catalog is intentionally the same
// shape Palette Studio / a future font-pairing mode would emit (vibe → heading
// + body), so the tools stay aware of each other: a board built here can later
// consume a pairing chosen upstream without reshaping the data.

export interface FontPairing {
  id: string;
  /** Short human label shown in the picker, e.g. "Editorial". */
  vibe: string;
  headingFont: string;
  bodyFont: string;
}

export const FONT_PAIRINGS: FontPairing[] = [
  // Editorial / serif-led — classic, magazine, high-contrast display serifs.
  { id: "editorial", vibe: "Editorial", headingFont: "Playfair Display", bodyFont: "Inter" },
  { id: "classic", vibe: "Classic", headingFont: "Cormorant Garamond", bodyFont: "Nunito Sans" },
  { id: "warm", vibe: "Warm", headingFont: "Libre Baskerville", bodyFont: "Karla" },
  { id: "literary", vibe: "Literary", headingFont: "Lora", bodyFont: "Source Sans 3" },
  { id: "refined", vibe: "Refined", headingFont: "EB Garamond", bodyFont: "Montserrat" },
  { id: "boutique", vibe: "Boutique", headingFont: "Fraunces", bodyFont: "Work Sans" },
  { id: "heritage", vibe: "Heritage", headingFont: "Bodoni Moda", bodyFont: "Lato" },

  // Modern / sans-led — clean, tech, product, startup.
  { id: "minimal", vibe: "Minimal", headingFont: "Space Grotesk", bodyFont: "Inter" },
  { id: "product", vibe: "Product", headingFont: "Sora", bodyFont: "Inter" },
  { id: "geometric", vibe: "Geometric", headingFont: "Poppins", bodyFont: "Inter" },
  { id: "corporate", vibe: "Corporate", headingFont: "Manrope", bodyFont: "Manrope" },
  { id: "friendly", vibe: "Friendly", headingFont: "DM Sans", bodyFont: "DM Sans" },
  { id: "clean", vibe: "Clean", headingFont: "Outfit", bodyFont: "Inter" },

  // Bold / statement — heavy display, confident, high-impact.
  { id: "bold", vibe: "Bold", headingFont: "Archivo Black", bodyFont: "Archivo" },
  { id: "punch", vibe: "Punch", headingFont: "Anton", bodyFont: "Roboto" },
  { id: "grotesque", vibe: "Grotesque", headingFont: "Syne", bodyFont: "Inter" },
  { id: "brutalist", vibe: "Brutalist", headingFont: "Bricolage Grotesque", bodyFont: "Work Sans" },

  // Character / distinctive — friendly-serif, rounded, personality.
  { id: "rounded", vibe: "Rounded", headingFont: "Quicksand", bodyFont: "Nunito" },
  { id: "elegant", vibe: "Elegant", headingFont: "Marcellus", bodyFont: "Josefin Sans" },
  { id: "crafted", vibe: "Crafted", headingFont: "Spectral", bodyFont: "Karla" },
];

function familyToQuery(family: string): string {
  // Load a useful weight range for each family; Google collapses unknown ones.
  return `family=${family.replace(/ /g, "+")}:wght@400;500;600;700;800;900`;
}

function familyId(family: string): string {
  return "bb-font-" + family.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

// Track which families we've already injected so we never double-load.
const loaded = new Set<string>();

/**
 * Load one or more font families on demand via a per-family <link>. Lazy loading
 * (rather than one giant up-front request) keeps startup fast even as the
 * pairing library grows — we only fetch the faces a board actually uses.
 * Idempotent per family.
 */
export function loadFontFamilies(families: string[]): void {
  for (const family of families) {
    const id = familyId(family);
    if (loaded.has(family) || document.getElementById(id)) {
      loaded.add(family);
      continue;
    }
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?" + familyToQuery(family) + "&display=swap";
    document.head.appendChild(link);
    loaded.add(family);
  }
}

/** Load the default pairing's fonts so the empty-state board paints correctly. */
export function ensureBoardFontsLoaded(): void {
  const first = FONT_PAIRINGS[0];
  loadFontFamilies([first.headingFont, first.bodyFont]);
}

/**
 * Resolve when the specific families are actually ready to paint, so the PNG
 * rasterizer never captures a fallback face. Uses the FontFace Loading API with
 * a bounded wait so a slow/absent font never hangs the export.
 */
export async function waitForFonts(families: string[]): Promise<void> {
  if (!("fonts" in document)) return;
  const loads = families.flatMap((f) =>
    ["700 40px", "400 20px"].map((spec) =>
      document.fonts.load(`${spec} "${f}"`).catch(() => undefined),
    ),
  );
  await Promise.race([
    Promise.all(loads).then(() => undefined),
    new Promise<void>((r) => setTimeout(r, 2500)),
  ]);
}
