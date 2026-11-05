import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDown,
  ArrowUp,
  ChevronsDown,
  ChevronsUp,
  Eye,
  EyeOff,
  Home,
  Image as ImageIcon,
  ImageOff,
  ImagePlus,
  Loader2,
  LogOut,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deletePhoto,
  listAllPhotos,
  reorderPhotos,
  replacePhoto,
  updatePhoto,
  uploadPhoto,
  type ActivityPhoto,
} from "@/lib/activity-photos";

export const Route = createFileRoute("/_authenticated/admin/photos")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Hình ảnh | TML Admin" },
      { name: "description", content: "Quản lý ảnh hoạt động hiển thị trên trang chủ TML." },
      { property: "og:title", content: "Hình ảnh – TML" },
      { property: "og:description", content: "Khu vực quản trị ảnh trang chủ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPhotos,
});

type PendingUpload = {
  key: string;
  name: string;
  preview: string;
  error?: string;
};

function AdminPhotos() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "admin");
      return (data?.length ?? 0) > 0;
    },
  });

  const photos = useQuery({
    queryKey: ["activity-photos", "all"],
    queryFn: listAllPhotos,
    enabled: isAdmin.data === true,
  });

  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "visible" | "hidden">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // Keep a ref to pending uploads to cleanup object URLs on unmount
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  useEffect(() => {
    return () => {
      pendingRef.current.forEach((item) => {
        URL.revokeObjectURL(item.preview);
      });
    };
  }, []);

  // Prevent browser from opening files dropped outside dropzone
  useEffect(() => {
    const block = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error("Lỗi: " + (e as Error).message);
    } finally {
      setBusy(false);
      qc.invalidateQueries({ queryKey: ["activity-photos"] });
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const list = useMemo(() => photos.data ?? [], [photos.data]);

  const moveTo = (id: string, target: number) => {
    if (busy) return;
    const ids = list.map((p) => p.id);
    const from = ids.indexOf(id);
    if (from < 0 || target === from || target < 0 || target >= ids.length) return;
    ids.splice(target, 0, ids.splice(from, 1)[0]!);
    run(() => reorderPhotos(ids), "Đã cập nhật thứ tự.");
  };

  const handleFiles = async (files: File[]) => {
    if (!files.length) return;

    const validFiles = files.filter((f) => f.type.startsWith("image/"));
    const ignoredCount = files.length - validFiles.length;
    if (ignoredCount > 0) {
      toast.error(`Bỏ qua ${ignoredCount} tệp không phải ảnh.`);
    }
    if (!validFiles.length) return;

    const newPending: PendingUpload[] = validFiles.map((file, i) => ({
      key: `${Date.now()}-${i}-${file.name}`,
      name: file.name,
      preview: URL.createObjectURL(file),
    }));

    setPending((prev) => [...prev, ...newPending]);

    let successCount = 0;
    let failCount = 0;
    let runningOrder = list.length;

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]!;
      const item = newPending[i]!;

      try {
        runningOrder++;
        await uploadPhoto(file, "", runningOrder);
        successCount++;
        setPending((prev) => prev.filter((p) => p.key !== item.key));
        URL.revokeObjectURL(item.preview);
        qc.invalidateQueries({ queryKey: ["activity-photos"] });
      } catch (err: unknown) {
        failCount++;
        const errorMsg = err instanceof Error ? err.message : String(err);
        setPending((prev) => prev.map((p) => (p.key === item.key ? { ...p, error: errorMsg } : p)));
      }
    }

    if (successCount > 0) {
      toast.success(`Đã tải lên ${successCount} ảnh.`);
    }
    if (failCount > 0) {
      toast.error(`Có ${failCount} ảnh tải lên thất bại.`);
    }
  };

  const dismissPending = (key: string) => {
    setPending((prev) => {
      const target = prev.find((p) => p.key === key);
      if (target) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter((p) => p.key !== key);
    });
  };

  const firstThreeVisibleIds = useMemo(() => {
    return new Set(
      list
        .filter((p) => p.visible)
        .slice(0, 3)
        .map((p) => p.id),
    );
  }, [list]);

  const activePhoto = list.find((p) => p.id === openId) ?? null;

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
        setDragOver(false);
      }
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files ?? []);
      handleFiles(files);
    },
  };

  if (isAdmin.isLoading) return <p className="p-10 text-center">Đang kiểm tra quyền…</p>;
  if (!isAdmin.data)
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <p>Tài khoản này không có quyền quản trị.</p>
        <button onClick={signOut} className="mt-4 text-primary underline">
          <LogOut className="mr-1 inline h-4 w-4" />
          Đăng xuất
        </button>
      </div>
    );

  const total = list.length;
  const visibleCount = list.filter((p) => p.visible).length;
  const hiddenCount = total - visibleCount;

  const filteredList = list.filter((p) => {
    if (filter === "visible") return p.visible;
    if (filter === "hidden") return !p.visible;
    return true;
  });

  return (
    <section className="mx-auto max-w-7xl space-y-6 px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      <AdminPageHeader
        title="Hình ảnh"
        actions={
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Tải ảnh lên"
            title="Tải ảnh lên"
          >
            <Upload className="h-4 w-4" />
            Tải ảnh lên
          </button>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        disabled={busy}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          handleFiles(files);
        }}
      />

      {/* Thanh tóm tắt + bộ lọc */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="hidden text-xs text-muted-foreground sm:block">
          3 ảnh đang hiện đầu tiên xuất hiện ngay khi khách mở trang chủ.
        </p>

        <div className="inline-flex w-full rounded-xl bg-muted p-1 text-xs font-medium sm:w-auto">
          {(
            [
              { key: "all", label: "Tất cả", count: total },
              { key: "visible", label: "Đang hiện", count: visibleCount },
              { key: "hidden", label: "Đang ẩn", count: hiddenCount },
            ] as const
          ).map(({ key, label, count }) => {
            const isActive = filter === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={isActive}
                onClick={() => setFilter(key)}
                className={`inline-flex h-8 flex-1 items-center justify-center rounded-lg px-3 py-1 transition-colors sm:flex-none ${
                  isActive
                    ? "bg-card font-semibold text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{label}</span>
                <span className="ml-1 tabular-nums opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Trạng thái đang tải */}
      {photos.isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[4/3] w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Danh sách rỗng hoàn toàn */}
      {!photos.isLoading && list.length === 0 && pending.length === 0 && (
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
          {...dropHandlers}
          className={`flex min-h-72 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/60 hover:bg-primary/5"
          }`}
        >
          <ImagePlus className="mb-2 h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground sm:hidden">Chạm để thêm ảnh</p>
          <p className="hidden text-sm font-semibold text-foreground sm:block">
            Kéo thả ảnh vào đây hoặc bấm để chọn ảnh
          </p>
          <p className="mt-1 hidden text-xs text-muted-foreground sm:block">
            Có thể chọn nhiều ảnh cùng lúc. Định dạng PNG, JPG, WebP...
          </p>
          <p className="mt-2 text-xs font-medium text-primary">
            Ảnh sẽ hiển thị ở mục Khoảnh khắc cùng TML trên trang chủ.
          </p>
        </button>
      )}

      {/* Lọc không có kết quả */}
      {!photos.isLoading &&
        list.length > 0 &&
        filteredList.length === 0 &&
        pending.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            {filter === "visible" ? "Không có ảnh nào đang hiện." : "Không có ảnh nào đang ẩn."}
          </div>
        )}

      {/* Lưới thẻ ảnh */}
      {!photos.isLoading && (filteredList.length > 0 || pending.length > 0) && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
          {filteredList.map((p) => {
            const originalIndex = list.findIndex((item) => item.id === p.id);
            const isFeaturedHome = firstThreeVisibleIds.has(p.id);
            const isSelected = p.id === openId;

            return (
              <PhotoCard
                key={p.id}
                photo={p}
                index={originalIndex}
                isFeaturedHome={isFeaturedHome}
                isSelected={isSelected}
                busy={busy}
                onOpen={(id) => setOpenId(id)}
                onToggle={(item) =>
                  run(
                    () => updatePhoto(item.id, { visible: !item.visible }),
                    item.visible ? "Đã ẩn ảnh." : "Đã hiện ảnh.",
                  )
                }
              />
            );
          })}

          {/* Các thẻ đang tải lên (pending) */}
          {pending.map((item) => (
            <div key={item.key} className="flex flex-col">
              <div
                className={`relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-muted shadow-2xs ${
                  item.error ? "border-destructive bg-destructive/5" : "border-border/70"
                }`}
              >
                <img
                  src={item.preview}
                  alt={item.name}
                  className="h-full w-full object-cover opacity-60"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                  {item.error ? (
                    <div className="flex flex-col items-center justify-center rounded-lg bg-card/90 p-2 shadow-xs backdrop-blur-sm">
                      <p className="line-clamp-2 text-[11px] font-medium text-destructive">
                        {item.error}
                      </p>
                      <button
                        type="button"
                        onClick={() => dismissPending(item.key)}
                        className="mt-1 text-xs font-semibold text-destructive underline hover:text-destructive/80"
                      >
                        Bỏ
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-lg bg-card/85 px-2.5 py-1.5 shadow-xs backdrop-blur-sm">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="mt-1 max-w-[120px] truncate text-[11px] font-medium text-foreground">
                        {item.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-2 line-clamp-1 truncate text-sm text-muted-foreground">
                {item.name}
              </p>
            </div>
          ))}

          {/* Ô kéo thả tải ảnh cuối lưới (chỉ hiện khi filter === "all") */}
          {filter === "all" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              {...dropHandlers}
              className={`flex aspect-[4/3] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/60 hover:bg-primary/5"
              }`}
            >
              <ImagePlus className="mb-1.5 h-6 w-6 text-muted-foreground sm:h-7 sm:w-7" />
              <span className="text-xs font-semibold text-foreground sm:hidden">Thêm ảnh</span>
              <span className="hidden text-xs font-semibold text-foreground sm:inline">
                Kéo thả ảnh vào đây
              </span>
              <span className="mt-0.5 hidden text-[11px] text-muted-foreground sm:inline">
                hoặc bấm để chọn, có thể chọn nhiều ảnh
              </span>
            </button>
          )}
        </div>
      )}

      {/* Drawer chi tiết ảnh */}
      <AnimatePresence>
        {activePhoto && (
          <PhotoDrawer
            key={activePhoto.id}
            photo={activePhoto}
            index={list.findIndex((p) => p.id === activePhoto.id)}
            total={list.length}
            busy={busy}
            onClose={() => setOpenId(null)}
            onUpdateCaption={async (id, cap) => {
              await run(() => updatePhoto(id, { caption: cap }), "Đã lưu chú thích.");
            }}
            onToggleVisible={async (p, nextVisible) => {
              await run(
                () => updatePhoto(p.id, { visible: nextVisible }),
                nextVisible ? "Đã hiện ảnh." : "Đã ẩn ảnh.",
              );
            }}
            onReplace={async (p, file) => {
              await run(() => replacePhoto(p, file), "Đã thay ảnh.");
            }}
            onMoveTo={moveTo}
            onDelete={async (p) => {
              await run(async () => {
                await deletePhoto(p);
                setOpenId(null);
              }, "Đã xóa ảnh.");
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function PhotoCard({
  photo,
  index,
  isFeaturedHome,
  isSelected,
  busy,
  onOpen,
  onToggle,
}: {
  photo: ActivityPhoto;
  index: number;
  isFeaturedHome: boolean;
  isSelected: boolean;
  busy: boolean;
  onOpen: (id: string) => void;
  onToggle: (photo: ActivityPhoto) => void;
}) {
  return (
    <div className="group relative flex flex-col">
      <div
        className={`relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border/70 bg-muted shadow-2xs transition-all hover:border-primary/40 ${
          isSelected ? "ring-2 ring-primary" : ""
        }`}
      >
        {/* Nút chính phủ toàn bộ ảnh để mở drawer */}
        <button
          type="button"
          onClick={() => onOpen(photo.id)}
          aria-label={`Mở ảnh #${index + 1}`}
          className="absolute inset-0 z-0 h-full w-full cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {photo.url ? (
            <img
              src={photo.url}
              alt={photo.alt_text || photo.caption}
              className={`h-full w-full object-cover transition-transform duration-200 group-hover:scale-105 ${
                photo.visible ? "" : "grayscale opacity-50"
              }`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground/40">
              <ImageOff className="h-8 w-8" />
            </div>
          )}
        </button>

        {/* Chip góc trên-trái: #n và Hiện đầu */}
        <div className="pointer-events-none absolute left-1.5 top-1.5 z-10 flex flex-wrap items-center gap-1.5 sm:left-2 sm:top-2">
          <span className="rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
            #{index + 1}
          </span>
          {isFeaturedHome && (
            <span
              title="Hiện đầu tiên trên trang chủ"
              className="inline-flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground shadow-xs max-sm:gap-0"
            >
              <Home className="h-3 w-3" />
              <span className="max-sm:sr-only">Hiện đầu</span>
            </span>
          )}
        </div>

        {/* Chip góc dưới-trái: Đang ẩn */}
        {!photo.visible && (
          <div className="pointer-events-none absolute bottom-1.5 left-1.5 z-10 sm:bottom-2 sm:left-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-foreground/80 px-1.5 py-0.5 text-[11px] font-medium text-background backdrop-blur-sm">
              <EyeOff className="h-3 w-3" />
              Đang ẩn
            </span>
          </div>
        )}

        {/* Nút ẩn/hiện nhanh góc trên-phải (anh em sibling với nút mở drawer) */}
        <button
          type="button"
          disabled={busy}
          aria-label={photo.visible ? "Ẩn khỏi trang chủ" : "Hiện trên trang chủ"}
          title={photo.visible ? "Ẩn khỏi trang chủ" : "Hiện trên trang chủ"}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(photo);
          }}
          className="absolute right-1.5 top-1.5 z-10 grid h-7 w-7 place-items-center rounded-full border border-border/60 bg-card/90 text-foreground shadow-xs backdrop-blur-sm transition-opacity hover:bg-card focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 sm:right-2 sm:top-2 sm:h-8 sm:w-8 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        >
          {photo.visible ? (
            <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          ) : (
            <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          )}
        </button>
      </div>

      {/* Chú thích dưới ảnh */}
      {photo.caption ? (
        <p className="mt-2 line-clamp-1 text-sm font-medium text-foreground">{photo.caption}</p>
      ) : (
        <p className="mt-2 hidden line-clamp-1 text-sm italic text-muted-foreground sm:block">
          Chưa có chú thích
        </p>
      )}
    </div>
  );
}

function PhotoDrawer({
  photo,
  index,
  total,
  busy,
  onClose,
  onUpdateCaption,
  onToggleVisible,
  onReplace,
  onMoveTo,
  onDelete,
}: {
  photo: ActivityPhoto;
  index: number;
  total: number;
  busy: boolean;
  onClose: () => void;
  onUpdateCaption: (id: string, caption: string) => Promise<void>;
  onToggleVisible: (photo: ActivityPhoto, nextVisible: boolean) => Promise<void>;
  onReplace: (photo: ActivityPhoto, file: File) => Promise<void>;
  onMoveTo: (id: string, target: number) => void;
  onDelete: (photo: ActivityPhoto) => Promise<void>;
}) {
  const [caption, setCaption] = useState(photo.caption);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCaption(photo.caption);
    setConfirmDelete(false);
  }, [photo.id, photo.caption]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed inset-0 bg-black/20 backdrop-blur-xs"
        onClick={() => !busy && onClose()}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Ảnh #${index + 1}`}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative z-10 flex h-full w-full max-w-[560px] flex-col border-l border-border bg-card shadow-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-2 ring-primary/20">
              <ImageIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-foreground">Ảnh #{index + 1}</h2>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                    photo.visible
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {photo.visible ? "Đang hiện" : "Đang ẩn"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Vị trí {index + 1} / {total}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nội dung cuộn */}
        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          {/* 1. Ảnh lớn */}
          <div className="space-y-2.5">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border/70 bg-muted">
              {photo.url ? (
                <img
                  src={photo.url}
                  alt={photo.alt_text || photo.caption}
                  className={`h-full w-full object-cover ${
                    photo.visible ? "" : "grayscale opacity-60"
                  }`}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                  <ImageOff className="h-10 w-10" />
                </div>
              )}
            </div>

            <div>
              <input
                ref={replaceInputRef}
                type="file"
                accept="image/*"
                hidden
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) {
                    if (!file.type.startsWith("image/")) {
                      toast.error("Vui lòng chọn tệp hình ảnh.");
                      return;
                    }
                    onReplace(photo, file);
                  }
                }}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => replaceInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Thay ảnh
              </button>
            </div>
          </div>

          {/* 2. Chú thích */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Chú thích</label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={200}
                disabled={busy}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && caption.trim() !== (photo.caption ?? "").trim()) {
                    e.preventDefault();
                    onUpdateCaption(photo.id, caption.trim());
                  }
                }}
                placeholder="Nhập chú thích cho ảnh…"
                className="h-9 flex-1 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              />
              <button
                type="button"
                disabled={busy || caption.trim() === (photo.caption ?? "").trim()}
                onClick={() => onUpdateCaption(photo.id, caption.trim())}
                className="rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Lưu
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Hiện dưới ảnh trên trang chủ và dùng làm mô tả cho trình đọc màn hình.
            </p>
          </div>

          {/* 3. Hiển thị */}
          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3">
            <div>
              <p className="text-xs font-semibold text-foreground">Hiện trên trang chủ</p>
              <p className="text-[11px] text-muted-foreground">
                Tắt để tạm ẩn ảnh khỏi trang chủ mà không cần xóa.
              </p>
            </div>
            <Switch
              disabled={busy}
              checked={photo.visible}
              onCheckedChange={(checked) => onToggleVisible(photo, checked)}
            />
          </div>

          {/* 4. Vị trí */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Vị trí trong danh sách</label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busy || index === 0}
                onClick={() => onMoveTo(photo.id, 0)}
                className="inline-flex items-center gap-1 rounded-xl border border-border/80 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronsUp className="h-3.5 w-3.5" />
                Lên đầu
              </button>
              <button
                type="button"
                disabled={busy || index === 0}
                onClick={() => onMoveTo(photo.id, index - 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-border/80 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUp className="h-3.5 w-3.5" />
                Lên
              </button>
              <button
                type="button"
                disabled={busy || index === total - 1}
                onClick={() => onMoveTo(photo.id, index + 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-border/80 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowDown className="h-3.5 w-3.5" />
                Xuống
              </button>
              <button
                type="button"
                disabled={busy || index === total - 1}
                onClick={() => onMoveTo(photo.id, total - 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-border/80 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronsDown className="h-3.5 w-3.5" />
                Xuống cuối
              </button>
            </div>
          </div>

          {/* 5. Danger zone xóa ảnh */}
          <section className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Xóa ảnh</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Ảnh sẽ bị xóa vĩnh viễn khỏi kho lưu trữ và không khôi phục được. Muốn tạm gỡ khỏi
              trang chủ, hãy tắt Hiện trên trang chủ.
            </p>
            {confirmDelete ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onDelete(photo)}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-destructive px-4 text-xs font-semibold text-white transition-colors hover:bg-destructive/90 disabled:opacity-50"
                >
                  Xác nhận xóa vĩnh viễn
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmDelete(false)}
                  className="h-9 cursor-pointer rounded-xl border border-border px-4 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                >
                  Thôi
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-destructive/40 px-4 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Xóa ảnh
              </button>
            )}
          </section>
        </div>
      </motion.div>
    </div>
  );
}
