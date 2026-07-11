import { useEffect, useRef, useState, type ReactNode } from "react";
import { Spin, Typography } from "antd";

const { Text } = Typography;

/**
 * PdfPreviewPane — a reusable, document-agnostic live PDF preview.
 *
 * Hand it a `blobFactory` that produces a PDF (or any renderable) Blob and a
 * `deps` array; whenever deps change it debounces, regenerates, and shows the
 * result in an <iframe> via an object URL. Pair it with a Download button that
 * calls the SAME blobFactory so what you preview is exactly what you download.
 *
 * Object-URL lifecycle is handled carefully: the previous URL is revoked before
 * a new one is set, and the last URL is revoked on unmount — no leaks. Stale
 * generations (deps changed mid-render) are discarded via a cancelled flag.
 *
 * Note: the `#toolbar=0&navpanes=0&view=FitH` hints work in Chrome/Edge's
 * built-in PDF viewer (the common case) and degrade harmlessly elsewhere. In a
 * browser with no native PDF viewer the iframe may not render — the paired
 * Download button is the fallback.
 */
export interface PdfPreviewPaneProps {
  blobFactory: () => Promise<Blob | null>;
  deps: unknown[];
  enabled?: boolean;
  height?: number | string;
  debounceMs?: number;
  emptyText?: ReactNode;
}

export function PdfPreviewPane({
  blobFactory,
  deps,
  enabled = true,
  height = 480,
  debounceMs = 350,
  emptyText = "Nothing to preview yet.",
}: PdfPreviewPaneProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);
  const urlRef = useRef<string | null>(null);

  const setObjectUrl = (next: string | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next;
    setUrl(next);
  };

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    setErrored(false);

    const t = setTimeout(async () => {
      try {
        const blob = await blobFactory();
        if (cancelled) return;
        if (!blob) {
          setObjectUrl(null);
        } else {
          setObjectUrl(URL.createObjectURL(blob));
        }
      } catch {
        if (!cancelled) {
          setErrored(true);
          setObjectUrl(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, debounceMs, ...deps]);

  // Revoke the final URL on unmount.
  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const shell: React.CSSProperties = {
    position: "relative",
    height,
    borderRadius: 12,
    overflow: "hidden",
    background: "#f0efe9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div style={shell}>
      {url ? (
        <>
          <iframe
            title="PDF preview"
            src={`${url}#toolbar=0&navpanes=0&view=FitH`}
            style={{ width: "100%", height: "100%", border: "none" }}
          />
          {loading && (
            <div style={{ position: "absolute", top: 12, right: 12 }}>
              <Spin size="small" />
            </div>
          )}
        </>
      ) : loading ? (
        <Spin />
      ) : (
        <Text type={errored ? "danger" : "secondary"}>
          {errored ? "Preview failed — try Download instead." : emptyText}
        </Text>
      )}
    </div>
  );
}
