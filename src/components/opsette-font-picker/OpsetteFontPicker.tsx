// AUTO-VENDORED from _shared — DO NOT EDIT HERE.
// Edit the master and run `node _shared/fonts/sync.mjs` to re-sync.

import { Select } from "antd";
import { useMemo, useState } from "react";
import {
  FONT_PAIRINGS,
  allVibeTags,
  pairingsByVibe,
  cssFamily,
  pairingPickerLabel,
  vibeHeading,
  loadPairings,
  getPairing,
} from "@/lib/shared-fonts";

/**
 * OpsetteFontPicker — the canonical font-pairing chooser for every Opsette
 * brand-kit tool (Palette Studio, Brand Board, Banner Designer).
 *
 * It is the ONE picker; the three tools each used to hand-roll their own flat
 * Ant `Select`. This one:
 *   • GROUPS pairs by their single `vibe` under an Ant `optGroup` section
 *     header (Minimal, Bold, Warm, Luxury, Editorial, Technical…). The vibe is
 *     a header for scanability, NOT a filter — every pair is shown, once.
 *   • renders each option IN ITS OWN heading font, so the menu is a live type
 *     preview, and shows the "Heading + Body" families beneath.
 *   • lazily loads every pairing's fonts the first time the menu opens, so the
 *     preview paints real faces without slowing app startup.
 *
 * Driven ENTIRELY by the shared library — no hand-written pair data. Value in /
 * out is the library pairing `id` (the interop key stored in blobs).
 *
 * Vendored like `opsette-header` / `opsette-share`: the master lives at
 * `_shared/opsette-font-picker/` and a byte-identical copy is synced into each
 * consuming tool at `src/components/opsette-font-picker/`. It reads the tool's
 * co-located vendored `@/lib/shared-fonts`. Never hand-edit a vendored copy.
 */

interface OpsetteFontPickerProps {
  /** The selected pairing id (library slug). Falls back to the first pairing. */
  value: string;
  /** Called with the newly selected pairing id. */
  onChange: (id: string) => void;
  /** Ant Select size. Pass "large" on mobile for a comfortable tap target. */
  size?: "small" | "middle" | "large";
  /** Optional width override; defaults to full width (mobile-first). */
  width?: number | string;
}

export function OpsetteFontPicker({
  value,
  onChange,
  size = "middle",
  width = "100%",
}: OpsetteFontPickerProps) {
  // Track whether we've injected the whole library's <link>s yet, so the menu
  // paints in-font. Deferred until first open to keep startup light.
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Build grouped options once: one Ant optGroup per vibe (first-seen = library
  // order), pairs inside in library order. Each option renders its heading font.
  const groups = useMemo(
    () =>
      allVibeTags().map((vibe) => ({
        label: vibeHeading(vibe),
        title: vibeHeading(vibe),
        options: pairingsByVibe(vibe).map((p) => ({
          value: p.id,
          // `title` is the plain-text used for search + the closed control's
          // accessible name; `label` is the in-font visual.
          title: pairingPickerLabel(p),
          label: (
            <span style={{ fontFamily: cssFamily(p.heading), fontSize: 15, lineHeight: 1.4 }}>
              {pairingPickerLabel(p)}
            </span>
          ),
        })),
      })),
    [],
  );

  const selected = getPairing(value);

  return (
    <Select
      value={selected.id}
      onChange={onChange}
      style={{ width }}
      size={size}
      showSearch
      optionFilterProp="title"
      options={groups}
      // Show the picked pair in its own heading font in the closed control too.
      labelRender={({ value: v }) => {
        const p = getPairing(String(v));
        return (
          <span style={{ fontFamily: cssFamily(p.heading) }}>
            {pairingPickerLabel(p)}
          </span>
        );
      }}
      onDropdownVisibleChange={(open) => {
        if (open && !fontsLoaded) {
          loadPairings(FONT_PAIRINGS);
          setFontsLoaded(true);
        }
      }}
    />
  );
}

export default OpsetteFontPicker;
