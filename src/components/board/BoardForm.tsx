import { useState } from "react";
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
import type { BrandBoardData } from "./board.types";
import { MAX_COLORS } from "./board.types";
import { LAYOUTS, type LayoutId } from "./layouts";
import { FONT_PAIRINGS } from "@/lib/fonts";
import { ingestPalettePayload, ingestSignaturePayload } from "./ingest";
import { uuid } from "@/lib/uuid";

const { Text } = Typography;

interface BoardFormProps {
  data: BrandBoardData;
  onChange: (next: BrandBoardData) => void;
  layout: LayoutId;
  onLayoutChange: (id: LayoutId) => void;
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

export function BoardForm({ data, onChange, layout, onLayoutChange }: BoardFormProps) {
  const patch = (p: Partial<BrandBoardData>) => onChange({ ...data, ...p });
  // Seed the paste fields from any already-imported blobs so a reloaded/opened
  // board shows exactly what was imported — the input is never a black hole.
  const [paletteBlob, setPaletteBlob] = useState(data.sourceBlobs.palette ?? "");
  const [signatureBlob, setSignatureBlob] = useState(data.sourceBlobs.signature ?? "");

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
      {/* ---- Layout picker (the "wireframe") ---- */}
      <div>
        <Text strong>Layout</Text>
        <Segmented
          block
          style={{ marginTop: 8 }}
          value={layout}
          onChange={(v) => onLayoutChange(v as LayoutId)}
          options={LAYOUTS.map((l) => ({ label: l.name, value: l.id }))}
        />
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
          {LAYOUTS.find((l) => l.id === layout)?.blurb}
        </Text>
      </div>

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
            label: "QR code — upload from QR Creator",
            children: (
              <ImageDrop
                current={data.qrDataUrl}
                accept="image/png,image/svg+xml"
                onPick={(qrDataUrl) => patch({ qrDataUrl })}
                onClear={() => patch({ qrDataUrl: null })}
                label="Upload QR"
              />
            ),
          },
          {
            key: "card",
            label: "Digital card — upload from Digital Card",
            children: (
              <ImageDrop
                current={data.cardDataUrl}
                accept="image/png,image/jpeg"
                onPick={(cardDataUrl) => patch({ cardDataUrl })}
                onClear={() => patch({ cardDataUrl: null })}
                label="Upload card"
              />
            ),
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

// --- Simple image drop with preview ------------------------------------------
function ImageDrop({
  current,
  accept,
  onPick,
  onClear,
  label,
}: {
  current: string | null;
  accept: string;
  onPick: (dataUrl: string) => void;
  onClear: () => void;
  label: string;
}) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <Upload
        accept={accept}
        showUploadList={false}
        beforeUpload={(file) => {
          readImage(file, (dataUrl) => onPick(dataUrl));
          return false;
        }}
      >
        <Button icon={<UploadOutlined />}>{current ? "Replace" : label}</Button>
      </Upload>
      {current && (
        <>
          <img src={current} alt="" style={{ height: 40, width: "auto", borderRadius: 4 }} />
          <Button type="text" icon={<DeleteOutlined />} onClick={onClear} />
        </>
      )}
    </div>
  );
}
