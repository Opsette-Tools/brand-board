import { useEffect, useMemo, useRef, useState } from "react";
import { App as AntApp, Button, Card, Grid, Input, Modal, Space, Typography, message } from "antd";
import {
  FilePdfOutlined,
  FileImageOutlined,
  SaveOutlined,
  FolderOpenOutlined,
} from "@ant-design/icons";
import { ThemeProvider } from "@/lib/theme";
import Shell from "@/components/Shell";
import { BrandBoard } from "@/components/board/BrandBoard";
import { BoardForm } from "@/components/board/BoardForm";
import {
  emptyBoard,
  boardHasContent,
  type BrandBoardData,
} from "@/components/board/board.types";
import { ensureBoardFontsLoaded, loadFontFamilies } from "@/lib/fonts";
import { DEFAULT_LAYOUT, type LayoutId } from "@/components/board/layouts";
import {
  serializeProject,
  parseProject,
  projectFileName,
} from "@/components/board/projectFile";
import {
  BOARD_W,
  BOARD_H,
  boardToPngBlob,
  boardToPdfBlob,
} from "@/components/board/exportBoard";

const { Text } = Typography;

const STORAGE_KEY = "brand-board-draft";

function loadDraft(): BrandBoardData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...emptyBoard(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return emptyBoard();
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function BrandBoardInner() {
  const [data, setData] = useState<BrandBoardData>(loadDraft);
  const [layout, setLayout] = useState<LayoutId>(DEFAULT_LAYOUT);
  const [exporting, setExporting] = useState<null | "png" | "pdf">(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;

  useEffect(() => {
    ensureBoardFontsLoaded();
  }, []);

  const fontFamilies = useMemo(
    () => [data.headingFont, data.bodyFont],
    [data.headingFont, data.bodyFont],
  );

  // Load whatever fonts the current board uses (presets or payload-provided).
  useEffect(() => {
    loadFontFamilies(fontFamilies);
  }, [fontFamilies]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [data]);

  const hasContent = boardHasContent(data);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  // Save As: prefer the File System Access API (a real OS Save dialog where the
  // user picks BOTH the folder and the filename — Chrome/Edge). Fall back to a
  // filename modal + plain download where that API isn't available.
  const saveProject = async () => {
    const json = serializeProject(data, layout, new Date().toISOString());
    const suggested = projectFileName(data.kitName);

    const picker = (
      window as unknown as {
        showSaveFilePicker?: (opts: unknown) => Promise<{
          createWritable: () => Promise<{
            write: (d: string) => Promise<void>;
            close: () => Promise<void>;
          }>;
        }>;
      }
    ).showSaveFilePicker;

    if (picker) {
      try {
        const handle = await picker({
          suggestedName: suggested,
          types: [
            { description: "Brand Board project", accept: { "application/json": [".json"] } },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        message.success("Project saved");
      } catch (err) {
        // User cancelled the dialog — do nothing, no error toast.
        if ((err as Error)?.name !== "AbortError") {
          message.error("Save failed — try again.");
        }
      }
      return;
    }

    // Fallback: ask for a filename in a modal, then download.
    setSaveName(suggested.replace(/\.json$/, ""));
    setSaveModalOpen(true);
  };

  const doFallbackSave = () => {
    const json = serializeProject(data, layout, new Date().toISOString());
    const blob = new Blob([json], { type: "application/json" });
    const name = (saveName.trim() || "brand-kit").replace(/\.json$/, "");
    triggerDownload(blob, `${name}.json`);
    setSaveModalOpen(false);
    message.success("Project saved to your Downloads");
  };

  const openProjectFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const loaded = parseProject(reader.result as string);
      if (loaded) {
        setData(loaded.board);
        setLayout(loaded.layout);
        message.success("Project loaded");
      } else {
        message.error("That isn't a Brand Board project file.");
      }
    };
    reader.readAsText(file);
  };

  const doExport = async (kind: "png" | "pdf") => {
    if (!boardRef.current) return;
    setExporting(kind);
    try {
      const safe = (data.kitName || "brand-board")
        .replace(/[^a-z0-9-_]+/gi, "-")
        .toLowerCase();
      if (kind === "png") {
        const blob = await boardToPngBlob(boardRef.current, fontFamilies);
        triggerDownload(blob, `${safe}-brand-board.png`);
      } else {
        const blob = await boardToPdfBlob(boardRef.current, fontFamilies);
        triggerDownload(blob, `${safe}-brand-board.pdf`);
      }
      message.success(`${kind.toUpperCase()} downloaded`);
    } catch {
      message.error("Export failed — please try again.");
    } finally {
      setExporting(null);
    }
  };

  // Scale the full-size board down to fit the preview column width.
  const [previewWidth, setPreviewWidth] = useState(560);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = previewWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 560;
      setPreviewWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = previewWidth / BOARD_W;

  // The board grows to fit its content, so measure its real height to reserve
  // the correct preview space (no clipping) and to size the export.
  const [boardHeight, setBoardHeight] = useState(BOARD_H);
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const h = el.scrollHeight;
      if (h > 0) setBoardHeight(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const projectButtons = (
    <>
      <Button
        icon={<FolderOpenOutlined />}
        onClick={() => projectInputRef.current?.click()}
        title="Open a saved client project"
      >
        Open
      </Button>
      <Button
        icon={<SaveOutlined />}
        onClick={saveProject}
        disabled={!hasContent}
        title="Save this client's whole kit as a file you can reopen later"
      >
        Save
      </Button>
    </>
  );

  const exportButtons = (
    <Space>
      {projectButtons}
      <Button
        icon={<FileImageOutlined />}
        onClick={() => doExport("png")}
        loading={exporting === "png"}
        disabled={!hasContent || exporting !== null}
      >
        PNG
      </Button>
      <Button
        type="primary"
        icon={<FilePdfOutlined />}
        onClick={() => doExport("pdf")}
        loading={exporting === "pdf"}
        disabled={!hasContent || exporting !== null}
      >
        PDF
      </Button>
    </Space>
  );

  return (
    <Shell headerActions={!isMobile ? exportButtons : undefined}>
      <input
        ref={projectInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) openProjectFile(f);
          e.target.value = "";
        }}
      />
      <Modal
        title="Save project as"
        open={saveModalOpen}
        onOk={doFallbackSave}
        onCancel={() => setSaveModalOpen(false)}
        okText="Save"
      >
        <Text type="secondary" style={{ fontSize: 13 }}>
          Name this client's project file. It saves to your Downloads folder.
        </Text>
        <Input
          style={{ marginTop: 10 }}
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          addonAfter=".json"
          onPressEnter={doFallbackSave}
          autoFocus
        />
      </Modal>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "16px" : "24px 24px 48px", overflowX: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(340px, 420px) 1fr",
            gap: 28,
            alignItems: "start",
          }}
        >
          <Card styles={{ body: { padding: 20 } }}>
            <BoardForm
              data={data}
              onChange={setData}
              layout={layout}
              onLayoutChange={setLayout}
            />
          </Card>

          {/* minWidth:0 lets this 1fr grid track shrink below the board's
              intrinsic 1600px width instead of forcing the page wide. */}
          <div style={{ minWidth: 0 }}>
            <div
              ref={previewWrapRef}
              style={{
                width: "100%",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 18px 60px rgba(0,0,0,0.18)",
                background: "#e9e6de",
                // Reserve the REAL scaled board height so nothing clips.
                height: boardHeight * scale,
              }}
            >
              <div
                style={{
                  width: BOARD_W,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                <BrandBoard ref={boardRef} data={data} layout={layout} />
              </div>
            </div>

            {isMobile && (
              <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
                {exportButtons}
              </div>
            )}

            {!hasContent && (
              <Text
                type="secondary"
                style={{ display: "block", textAlign: "center", marginTop: 14, fontSize: 13 }}
              >
                Add a business name, a color, or a logo to enable export.
              </Text>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

export function BrandBoardApp() {
  return (
    <ThemeProvider>
      <AntApp>
        <BrandBoardInner />
      </AntApp>
    </ThemeProvider>
  );
}
