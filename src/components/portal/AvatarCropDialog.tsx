import { useEffect, useRef, useState } from "react";
import { Minus, Plus, X } from "lucide-react";

/** Preview frame is 3:4 to match the pass portrait; the exported file is 720×960. */
const FRAME_W = 240;
const FRAME_H = 320;
const OUT_W = 720;
const OUT_H = 960;
const MAX_ZOOM = 3;

type Props = {
  src: string;
  saving?: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
};

/**
 * Drag + zoom cropper for the member avatar. The user positions the photo inside
 * the 3:4 pass frame; we rasterise exactly that view so every avatar slot
 * (horizontal pass, vertical pass, exports) shows the chosen framing.
 */
export function AvatarCropDialog({ src, saving = false, onCancel, onConfirm }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  const dims = (z: number) => {
    const img = imgRef.current;
    if (!img) return { w: FRAME_W, h: FRAME_H };
    const scale = Math.max(FRAME_W / img.naturalWidth, FRAME_H / img.naturalHeight) * z;
    return { w: img.naturalWidth * scale, h: img.naturalHeight * scale };
  };

  const clamp = (o: { x: number; y: number }, z: number) => {
    const d = dims(z);
    return {
      x: Math.min(0, Math.max(FRAME_W - d.w, o.x)),
      y: Math.min(0, Math.max(FRAME_H - d.h, o.y)),
    };
  };

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const scale = Math.max(FRAME_W / img.naturalWidth, FRAME_H / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      setOffset({ x: (FRAME_W - w) / 2, y: (FRAME_H - h) / 2 });
      setReady(true);
    };
    img.src = src;
    return () => {
      img.onload = null;
    };
  }, [src]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  /** The parent flips `saving` back to false when the upload finishes (even on error). */
  useEffect(() => {
    if (!saving) setBusy(false);
  }, [saving]);

  const zoomTo = (next: number) => {
    const z = Math.min(MAX_ZOOM, Math.max(1, next));
    setZoom(z);
    setOffset((o) => clamp(o, z));
  };

  const confirm = () => {
    const img = imgRef.current;
    if (!img || busy || saving) return;
    setBusy(true);
    const canvas = document.createElement("canvas");
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setBusy(false);
      return;
    }
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, OUT_W, OUT_H);
    const scale = Math.max(FRAME_W / img.naturalWidth, FRAME_H / img.naturalHeight) * zoom;
    ctx.drawImage(
      img,
      -offset.x / scale,
      -offset.y / scale,
      FRAME_W / scale,
      FRAME_H / scale,
      0,
      0,
      OUT_W,
      OUT_H,
    );
    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob);
        else setBusy(false);
      },
      "image/jpeg",
      0.92,
    );
  };

  const stopDrag = () => {
    dragRef.current = null;
  };

  const view = dims(zoom);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chỉnh ảnh đại diện"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-gold/30 bg-[color:var(--portal-bg,#0d1527)]/95 p-5 text-white shadow-2xl shadow-black/80 backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <h2 className="text-lg font-bold text-gold">Chỉnh ảnh đại diện</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Đóng"
            className="rounded-full border border-gold/20 p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-white/60">
          Kéo ảnh để chọn vùng hiển thị · dùng + / − để thu phóng
        </p>

        <div className="mt-3 flex justify-center">
          <div
            className="relative h-[320px] w-[240px] touch-none select-none overflow-hidden rounded-xl border border-gold/40 bg-black/40"
            onPointerDown={(e) => {
              if (!ready) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              dragRef.current = {
                id: e.pointerId,
                x: e.clientX,
                y: e.clientY,
                ox: offset.x,
                oy: offset.y,
              };
            }}
            onPointerMove={(e) => {
              const d = dragRef.current;
              if (!d || d.id !== e.pointerId) return;
              setOffset(clamp({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }, zoom));
            }}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
            onLostPointerCapture={stopDrag}
            style={{ cursor: ready ? "grab" : "default" }}
          >
            {ready ? (
              <img
                src={src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute left-0 top-0 max-w-none select-none"
                style={{
                  width: view.w,
                  height: view.h,
                  transform: `translate(${offset.x}px, ${offset.y}px)`,
                }}
              />
            ) : (
              <span className="absolute inset-0 grid place-items-center text-xs text-white/60">
                Đang tải ảnh…
              </span>
            )}
            <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-gold/30" />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => zoomTo(zoom - 0.2)}
            disabled={zoom <= 1}
            aria-label="Thu nhỏ"
            className="rounded-full border border-white/20 p-1.5 text-white/80 transition hover:bg-white/10 disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.05}
            value={zoom}
            onChange={(e) => zoomTo(Number(e.target.value))}
            aria-label="Thu phóng ảnh"
            className="w-44 accent-amber-400"
          />
          <button
            type="button"
            onClick={() => zoomTo(zoom + 0.2)}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Phóng to"
            className="rounded-full border border-white/20 p-1.5 text-white/80 transition hover:bg-white/10 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white/80 transition hover:bg-white/10"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!ready || busy || saving}
            className="rounded-full bg-gold px-5 py-1.5 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60"
          >
            {busy || saving ? "Đang lưu…" : "Lưu ảnh"}
          </button>
        </div>
      </div>
    </div>
  );
}
