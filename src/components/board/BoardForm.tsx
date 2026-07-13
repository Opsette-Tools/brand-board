import { useRef, useState } from "react";
import {
  Button,
  Collapse,
  Input,
  Segmented,
  Select,
  Space,
  Typography,
  Upload,
  message,
} from "antd";
import { CopyOutlined, DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import type { BrandBoardData, SocialAsset, PageId } from "./board.types";
import { MAX_COLORS, PAGE_META } from "./board.types";
import { layoutsForPage, type LayoutId } from "./layouts";
import { FONT_PAIRINGS } from "@/lib/fonts";
import {
  ingestPalettePayload,
  ingestSignaturePayload,
  ingestQrPayload,
  ingestCardPayload,
  ingestSocialPayload,
} from "./ingest";
import { uuid } from "@/lib/uuid";

const { Text } = Typography;

interface BoardFormProps {
  data: BrandBoardData;
  onChange: (next: BrandBoardData) => void;
  /** The page currently on screen — the layout picker edits THIS page's layout. */
  activePage: PageId;
}

// Read an uploaded image file to a data URL + intrinsic size.
function readImage(
  file: File,
  cb: (dataUrl: string, w: number | null, h: number | null) => void,
) {
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result as string;
    const img = new Image();
    img.onload = () => cb(dataUrl, img.naturalWidth, img.naturalHeight);
    img.onerror = () => cb(dataUrl, null, null);
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

export function BoardForm({ data, onChange, activePage }: BoardFormProps) {
  const patch = (p: Partial<BrandBoardData>) => onChange({ ...data, ...p });

  // The layout picker acts on the ACTIVE page only. Each page carries its own
  // layout in data.pageLayouts, and offers only the layouts that suit it.
  const pageLayout = data.pageLayouts[activePage];
  const pageLayoutOptions = layoutsForPage(activePage);
  const setPageLayout = (id: LayoutId) =>
    patch({ pageLayouts: { ...data.pageLayouts, [activePage]: id } });
  // Seed the paste fields from any already-imported blobs so a reloaded/opened
  // board shows exactly what was imported — the input is never a black hole.
  // Re-seed whenever Open swaps in a DIFFERENT stored blob: a plain once-only
  // useState initializer wouldn't update on reopen (this component reconciles
  // rather than remounts), which is what made a reopened kit look empty even
  // though the blob was loaded and the Copy button worked.
  const [paletteBlob, setPaletteBlob] = useState(data.sourceBlobs.palette ?? "");
  const lastPaletteSeed = useRef(data.sourceBlobs.palette);
  if (data.sourceBlobs.palette !== lastPaletteSeed.current) {
    lastPaletteSeed.current = data.sourceBlobs.palette;
    setPaletteBlob(data.sourceBlobs.palette ?? "");
  }
  const [signatureBlob, setSignatureBlob] = useState(data.sourceBlobs.signature ?? "");
  const lastSignatureSeed = useRef(data.sourceBlobs.signature);
  if (data.sourceBlobs.signature !== lastSignatureSeed.current) {
    lastSignatureSeed.current = data.sourceBlobs.signature;
    setSignatureBlob(data.sourceBlobs.signature ?? "");
  }

  const copyBlob = async (blob: string | null, label: string) => {
    if (!blob) return;
    try {
      await navigator.clipboard.writeText(blob);
      message.success(`${label} copied`);
    } catch {
      message.error("Couldn't copy — select the text and copy manually.");
    }
  };

  const handlePastePalette = () => {
    const next = ingestPalettePayload(paletteBlob, data);
    if (next) {
      // Keep the raw blob in state (re-copyable + archived), don't wipe input.
      onChange({
        ...next,
        sourceBlobs: { ...next.sourceBlobs, palette: paletteBlob.trim() },
      });
      message.success("Palette imported from Palette Studio");
    } else {
      message.error("That doesn't look like a Palette Studio export.");
    }
  };

  const handlePasteSignature = () => {
    const html = ingestSignaturePayload(signatureBlob);
    if (html) {
      onChange({
        ...data,
        signatureHtml: html,
        sourceBlobs: { ...data.sourceBlobs, signature: signatureBlob.trim() },
      });
      message.success("Signature imported");
    } else {
      message.error("That doesn't look like a Signature Studio export.");
    }
  };

  return (
    <Space direction="vertical" size={18} style={{ width: "100%" }}>
      {/* ---- Layout picker (the "wireframe"), scoped to the active page ----
          Only pages with a real choice (Foundation, today) show it. Pages that
          only stack cleanly hide the picker rather than offer a single option. */}
      {pageLayoutOptions.length > 1 && (
        <div>
          <Text strong>Layout</Text>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
            {PAGE_META[activePage].index} · {PAGE_META[activePage].title}
          </Text>
          <Segmented
            block
            style={{ marginTop: 8 }}
            value={pageLayout}
            onChange={(v) => setPageLayout(v as LayoutId)}
            options={pageLayoutOptions.map((l) => ({ label: l.name, value: l.id }))}
          />
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
            {pageLayoutOptions.find((l) => l.id === pageLayout)?.blurb}
          </Text>
        </div>
      )}

      <div>
        <Text strong>Brand name</Text>
        <Input
          size="large"
          placeholder="e.g. Meridian Studio"
          value={data.kitName}
          onChange={(e) => patch({ kitName: e.target.value })}
          style={{ marginTop: 6 }}
        />
      </div>

      <div>
        <Text strong>Tagline</Text>
        <Input
          placeholder="A short line that sums up the brand"
          value={data.tagline}
          onChange={(e) => patch({ tagline: e.target.value })}
          style={{ marginTop: 6 }}
          maxLength={90}
        />
      </div>

      <div>
        <Text strong>Page color</Text>
        <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="color"
            value={data.pageColor}
            onChange={(e) => patch({ pageColor: e.target.value.toUpperCase() })}
            style={{ width: 34, height: 32, border: "none", background: "none", padding: 0 }}
          />
          <Input
            size="small"
            value={data.pageColor}
            onChange={(e) => patch({ pageColor: e.target.value.toUpperCase() })}
            style={{ width: 100, fontFamily: "monospace" }}
          />
          <Segmented
            size="small"
            value={data.pageColor.toUpperCase()}
            onChange={(v) => patch({ pageColor: v as string })}
            options={[
              { label: "Bone", value: "#F6F3EC" },
              { label: "White", value: "#FFFFFF" },
              { label: "Ink", value: "#141210" },
            ]}
          />
        </div>
      </div>

      <div>
        <Text strong>Logo</Text>
        <div style={{ marginTop: 6, display: "flex", gap: 10, alignItems: "center" }}>
          <Upload
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            showUploadList={false}
            beforeUpload={(file) => {
              readImage(file, (logoDataUrl, logoWidth, logoHeight) =>
                patch({ logoDataUrl, logoWidth, logoHeight }),
              );
              return false;
            }}
          >
            <Button icon={<UploadOutlined />}>
              {data.logoDataUrl ? "Replace" : "Upload logo"}
            </Button>
          </Upload>
          {data.logoDataUrl && (
            <>
              <img
                src={data.logoDataUrl}
                alt="logo"
                style={{ height: 34, width: "auto", borderRadius: 4 }}
              />
              <Button
                type="text"
                icon={<DeleteOutlined />}
                onClick={() => patch({ logoDataUrl: null, logoWidth: null, logoHeight: null })}
              />
            </>
          )}
        </div>
      </div>

      {/* ---- Import from the other tools ---- */}
      <Collapse
        defaultActiveKey={["palette"]}
        size="small"
        items={[
          {
            key: "palette",
            label: "Colors & fonts — paste from Palette Studio",
            children: (
              <Space direction="vertical" style={{ width: "100%" }} size={8}>
                <Input.TextArea
                  rows={3}
                  placeholder='Paste the "Export to Brand Board" blob from Palette Studio'
                  value={paletteBlob}
                  onChange={(e) => setPaletteBlob(e.target.value)}
                  style={{ fontFamily: "monospace", fontSize: 12 }}
                />
                <Space>
                  <Button onClick={handlePastePalette} disabled={!paletteBlob.trim()}>
                    Import palette
                  </Button>
                  {data.sourceBlobs.palette && (
                    <Button
                      icon={<CopyOutlined />}
                      onClick={() => copyBlob(data.sourceBlobs.palette, "Palette blob")}
                    >
                      Copy blob
                    </Button>
                  )}
                </Space>
                {data.sourceBlobs.palette && (
                  <Text type="success" style={{ fontSize: 12 }}>
                    ✓ Imported — this data is saved with the board.
                  </Text>
                )}
                {data.colors.length > 0 && (
                  <>
                    <Text type="secondary" style={{ fontSize: 12 }}>Brand colors</Text>
                    <ColorList data={data} onChange={onChange} />
                  </>
                )}
                {data.roles && (
                  <>
                    <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
                      Role colors
                    </Text>
                    <RolesList data={data} onChange={onChange} />
                  </>
                )}
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Font pairing</Text>
                  <Select
                    size="small"
                    style={{ width: "100%", marginTop: 4 }}
                    value={
                      FONT_PAIRINGS.find(
                        (p) => p.headingFont === data.headingFont && p.bodyFont === data.bodyFont,
                      )?.id ?? FONT_PAIRINGS[0].id
                    }
                    onChange={(id) => {
                      const p = FONT_PAIRINGS.find((fp) => fp.id === id);
                      if (p) patch({ headingFont: p.headingFont, bodyFont: p.bodyFont });
                    }}
                    options={FONT_PAIRINGS.map((p) => ({
                      value: p.id,
                      label: `${p.vibe} — ${p.headingFont} + ${p.bodyFont}`,
                    }))}
                  />
                </div>
              </Space>
            ),
          },
          {
            key: "signature",
            label: "Email signature — paste from Signature Studio",
            children: (
              <Space direction="vertical" style={{ width: "100%" }} size={8}>
                <Input.TextArea
                  rows={3}
                  placeholder='Paste the "Export to Brand Board" blob from Signature Studio'
                  value={signatureBlob}
                  onChange={(e) => setSignatureBlob(e.target.value)}
                  style={{ fontFamily: "monospace", fontSize: 12 }}
                />
                <Space wrap>
                  <Button onClick={handlePasteSignature} disabled={!signatureBlob.trim()}>
                    Import signature
                  </Button>
                  {data.sourceBlobs.signature && (
                    <Button
                      icon={<CopyOutlined />}
                      onClick={() => copyBlob(data.sourceBlobs.signature, "Signature blob")}
                    >
                      Copy blob
                    </Button>
                  )}
                  {data.signatureHtml && (
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={() =>
                        onChange({
                          ...data,
                          signatureHtml: null,
                          sourceBlobs: { ...data.sourceBlobs, signature: null },
                        })
                      }
                    >
                      Remove
                    </Button>
                  )}
                </Space>
                {data.sourceBlobs.signature && (
                  <Text type="success" style={{ fontSize: 12 }}>
                    ✓ Imported — this data is saved with the board.
                  </Text>
                )}
              </Space>
            ),
          },
          {
            key: "qr",
            label: "QR code — paste from QR Creator",
            children: (
              <BlobAsset
                data={data}
                onChange={onChange}
                assetKey="qr"
                imageKey="qrDataUrl"
                ingest={ingestQrPayload}
                assetLabel="QR"
              />
            ),
          },
          {
            key: "card",
            label: "Digital card — paste from Digital Card",
            children: (
              <BlobAsset
                data={data}
                onChange={onChange}
                assetKey="card"
                imageKey="cardDataUrl"
                vcardKey="cardVcardDataUrl"
                ingest={ingestCardPayload}
                assetLabel="card"
              />
            ),
          },
          {
            key: "social",
            label: "Social & brand assets — paste from Icon Kit",
            children: <SocialAssets data={data} onChange={onChange} />,
          },
        ]}
      />
    </Space>
  );
}

// --- Editable color list (colors arrive labeled from Palette Studio) ---------
function ColorList({
  data,
  onChange,
}: {
  data: BrandBoardData;
  onChange: (next: BrandBoardData) => void;
}) {
  const update = (id: string, hex: string, label: string) =>
    onChange({
      ...data,
      colors: data.colors.map((c) => (c.id === id ? { ...c, hex, label } : c)),
    });
  const remove = (id: string) =>
    onChange({ ...data, colors: data.colors.filter((c) => c.id !== id) });
  const add = () => {
    if (data.colors.length >= MAX_COLORS) return;
    onChange({ ...data, colors: [...data.colors, { id: uuid(), hex: "#888888", label: "" }] });
  };
  return (
    <Space direction="vertical" size={6} style={{ width: "100%" }}>
      {data.colors.map((c) => (
        <div key={c.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="color"
            value={c.hex}
            onChange={(e) => update(c.id, e.target.value.toUpperCase(), c.label)}
            style={{ width: 34, height: 32, border: "none", background: "none", padding: 0 }}
          />
          <Input
            size="small"
            value={c.hex}
            onChange={(e) => update(c.id, e.target.value.toUpperCase(), c.label)}
            style={{ width: 96, fontFamily: "monospace" }}
          />
          <Input
            size="small"
            placeholder="Role"
            value={c.label}
            onChange={(e) => update(c.id, c.hex, e.target.value)}
            style={{ flex: 1 }}
          />
          <Button size="small" type="text" icon={<DeleteOutlined />} onClick={() => remove(c.id)} />
        </div>
      ))}
      {data.colors.length < MAX_COLORS && (
        <Button size="small" onClick={add}>+ Add color</Button>
      )}
    </Space>
  );
}

// --- Editable role colors (background/surface/text/heading/muted/border) -----
const ROLE_FIELDS: { key: keyof NonNullable<BrandBoardData["roles"]>; label: string }[] = [
  { key: "background", label: "Page background" },
  { key: "surface", label: "Card background" },
  { key: "heading", label: "Heading" },
  { key: "text", label: "Body text" },
  { key: "mutedText", label: "Muted text" },
  { key: "border", label: "Border" },
];

function RolesList({
  data,
  onChange,
}: {
  data: BrandBoardData;
  onChange: (next: BrandBoardData) => void;
}) {
  if (!data.roles) return null;
  const roles = data.roles;
  const setRole = (key: keyof typeof roles, hex: string) =>
    onChange({ ...data, roles: { ...roles, [key]: hex } });

  return (
    <Space direction="vertical" size={6} style={{ width: "100%" }}>
      {ROLE_FIELDS.map(({ key, label }) => (
        <div key={key} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="color"
            value={roles[key]}
            onChange={(e) => setRole(key, e.target.value.toUpperCase())}
            style={{ width: 34, height: 32, border: "none", background: "none", padding: 0 }}
          />
          <Input
            size="small"
            value={roles[key]}
            onChange={(e) => setRole(key, e.target.value.toUpperCase())}
            style={{ width: 96, fontFamily: "monospace" }}
          />
          <Text style={{ flex: 1, fontSize: 13 }}>{label}</Text>
        </div>
      ))}
    </Space>
  );
}

// --- Blob-first asset (QR / card) --------------------------------------------
// Paste the app's "Export to Brand Board" blob: we STORE the whole blob (held,
// re-copyable, archived in the project file, pasteable back into its app) AND,
// if the blob carries a rendered image, show it on the board.
//
// There is deliberately NO manual image-upload fallback. QR Creator and Digital
// Card both bake `data.image` INTO the blob now (per the interop contract), so a
// single paste always brings the picture with it. The old upload path was the
// one place an image could be set WITHOUT its blob (image present, blob null →
// nothing to re-copy on reopen) — exactly the persistence gap this asset is
// meant to close. One blob in, one blob out: image and blob never diverge.
function BlobAsset({
  data,
  onChange,
  assetKey,
  imageKey,
  vcardKey,
  ingest,
  assetLabel,
}: {
  data: BrandBoardData;
  onChange: (next: BrandBoardData) => void;
  assetKey: "qr" | "card";
  imageKey: "qrDataUrl" | "cardDataUrl";
  // Card-only: the field a baked vCard is stored into. QR passes no vcardKey.
  vcardKey?: "cardVcardDataUrl";
  ingest: (input: string) => { image: string | null; vcard?: string | null; ok: boolean };
  assetLabel: string;
}) {
  // Seed the paste field from the stored blob, and re-seed it whenever a reopen
  // swaps in a different stored blob — so opening a saved kit shows the exact
  // blob that came back, not a stale/empty box. (A plain once-only useState
  // initializer wouldn't update on Open, since this component reconciles rather
  // than remounts.)
  const storedBlob = data.sourceBlobs[assetKey];
  const [blob, setBlob] = useState(storedBlob ?? "");
  const lastSeeded = useRef(storedBlob);
  if (storedBlob !== lastSeeded.current) {
    lastSeeded.current = storedBlob;
    setBlob(storedBlob ?? "");
  }
  const image = data[imageKey];

  const doImport = () => {
    const { image: img, vcard, ok } = ingest(blob);
    if (!ok) {
      message.error(`That doesn't look like a ${assetLabel} export.`);
      return;
    }
    onChange({
      ...data,
      // Store the image if the blob carried one; keep any existing upload if not.
      [imageKey]: img ?? data[imageKey],
      // Card-only: the vcard fully resets on every paste — a blob without a vcard
      // clears any prior one to null (same full-reset semantics as the image).
      ...(vcardKey ? { [vcardKey]: vcard ?? null } : {}),
      sourceBlobs: { ...data.sourceBlobs, [assetKey]: blob.trim() },
    });
    message.success(
      img ? `${assetLabel} imported` : `${assetLabel} data saved — upload the image below to show it`,
    );
  };

  const copyBlob = async () => {
    if (!storedBlob) return;
    try {
      await navigator.clipboard.writeText(storedBlob);
      message.success(`${assetLabel} blob copied`);
    } catch {
      message.error("Couldn't copy — select and copy manually.");
    }
  };

  const clearAll = () =>
    onChange({
      ...data,
      [imageKey]: null,
      ...(vcardKey ? { [vcardKey]: null } : {}),
      sourceBlobs: { ...data.sourceBlobs, [assetKey]: null },
    });

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={8}>
      <Input.TextArea
        rows={3}
        placeholder={`Paste the "Export to Brand Board" blob from ${assetLabel === "QR" ? "QR Creator" : "Digital Card"}`}
        value={blob}
        onChange={(e) => setBlob(e.target.value)}
        style={{ fontFamily: "monospace", fontSize: 12 }}
      />
      <Space wrap>
        <Button onClick={doImport} disabled={!blob.trim()}>
          Import {assetLabel}
        </Button>
        {storedBlob && (
          <Button icon={<CopyOutlined />} onClick={copyBlob}>
            Copy blob
          </Button>
        )}
        {(storedBlob || image) && (
          <Button type="text" icon={<DeleteOutlined />} onClick={clearAll}>
            Remove
          </Button>
        )}
      </Space>
      {storedBlob && (
        <Text type="success" style={{ fontSize: 12 }}>
          ✓ {assetLabel} saved with the board — reopen anytime and copy it back into{" "}
          {assetLabel === "QR" ? "QR Creator" : "Digital Card"}.
        </Text>
      )}
      {/* A current blob with no image is only an OLD blob (pre-baked-image era).
          The blob is still fully stored and re-copyable; there's just nothing to
          preview. Tell the user plainly rather than offer a dead upload path. */}
      {storedBlob && !image && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          This older {assetLabel} blob carries no picture — re-export it from{" "}
          {assetLabel === "QR" ? "QR Creator" : "Digital Card"} to show it on the board.
        </Text>
      )}
      {image && (
        <img
          src={image}
          alt={assetLabel}
          style={{ height: 72, width: "auto", borderRadius: 6, marginTop: 4 }}
        />
      )}
    </Space>
  );
}

// --- Social / brand assets (a LIST of images from Icon Kit) -------------------
// Paste a "social" blob (a list of labeled images: banners, avatar, favicon…) OR
// upload images manually. The whole blob is stored for archive/reopen; each
// image renders on the board by its natural aspect ratio.
function SocialAssets({
  data,
  onChange,
}: {
  data: BrandBoardData;
  onChange: (next: BrandBoardData) => void;
}) {
  const storedBlob = data.sourceBlobs.social;
  const [blob, setBlob] = useState(storedBlob ?? "");
  // Re-seed the textarea when Open swaps in a different stored blob, so a
  // reopened kit visibly shows the social blob (not just a working Copy button).
  const lastSeeded = useRef(storedBlob);
  if (storedBlob !== lastSeeded.current) {
    lastSeeded.current = storedBlob;
    setBlob(storedBlob ?? "");
  }

  const doImport = () => {
    const { assets, ok } = ingestSocialPayload(blob);
    if (!ok) {
      message.error("That doesn't look like an Icon Kit export (no images found).");
      return;
    }
    onChange({
      ...data,
      socialAssets: assets,
      sourceBlobs: { ...data.sourceBlobs, social: blob.trim() },
    });
    message.success(`Imported ${assets.length} asset${assets.length === 1 ? "" : "s"}`);
  };

  const copyBlob = async () => {
    if (!storedBlob) return;
    try {
      await navigator.clipboard.writeText(storedBlob);
      message.success("Social blob copied");
    } catch {
      message.error("Couldn't copy — select and copy manually.");
    }
  };

  // Accumulate across a multi-file batch: each file resolves async, so we buffer
  // results in a ref and flush once, appending to the assets present at flush
  // time — avoids siblings clobbering each other via stale closure state.
  const pendingRef = useRef<SocialAsset[]>([]);
  const flushTimer = useRef<number | null>(null);
  const addImages = (files: File[]) => {
    files.forEach((file) => {
      const r = new FileReader();
      r.onload = () => {
        const dataUrl = r.result as string;
        const img = new Image();
        const push = (w?: number, h?: number) => {
          pendingRef.current.push({
            id: uuid(),
            label: file.name.replace(/\.[^.]+$/, ""),
            image: dataUrl,
            width: w,
            height: h,
          });
          if (flushTimer.current !== null) window.clearTimeout(flushTimer.current);
          flushTimer.current = window.setTimeout(() => {
            const added = pendingRef.current;
            pendingRef.current = [];
            flushTimer.current = null;
            onChange({ ...data, socialAssets: [...data.socialAssets, ...added] });
          }, 60);
        };
        img.onload = () => push(img.naturalWidth, img.naturalHeight);
        img.onerror = () => push();
        img.src = dataUrl;
      };
      r.readAsDataURL(file);
    });
  };

  const removeAsset = (id: string) =>
    onChange({ ...data, socialAssets: data.socialAssets.filter((a) => a.id !== id) });

  const relabel = (id: string, label: string) =>
    onChange({
      ...data,
      socialAssets: data.socialAssets.map((a) => (a.id === id ? { ...a, label } : a)),
    });

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={8}>
      <Input.TextArea
        rows={3}
        placeholder='Paste the "Export to Brand Board" blob from Icon Kit'
        value={blob}
        onChange={(e) => setBlob(e.target.value)}
        style={{ fontFamily: "monospace", fontSize: 12 }}
      />
      <Space wrap>
        <Button onClick={doImport} disabled={!blob.trim()}>
          Import assets
        </Button>
        {storedBlob && (
          <Button icon={<CopyOutlined />} onClick={copyBlob}>
            Copy blob
          </Button>
        )}
        <Upload
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          showUploadList={false}
          multiple
          beforeUpload={(file) => {
            addImages([file as File]);
            return false;
          }}
        >
          <Button icon={<UploadOutlined />}>Upload images</Button>
        </Upload>
      </Space>
      {data.socialAssets.length > 0 && (
        <Space direction="vertical" size={6} style={{ width: "100%" }}>
          {data.socialAssets.map((a) => (
            <div key={a.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <img
                src={a.image}
                alt=""
                style={{ height: 32, width: "auto", maxWidth: 56, borderRadius: 4 }}
              />
              <Input
                size="small"
                value={a.label}
                placeholder="Label (e.g. LinkedIn banner)"
                onChange={(e) => relabel(a.id, e.target.value)}
                style={{ flex: 1 }}
              />
              <Button
                size="small"
                type="text"
                icon={<DeleteOutlined />}
                onClick={() => removeAsset(a.id)}
              />
            </div>
          ))}
        </Space>
      )}
    </Space>
  );
}
