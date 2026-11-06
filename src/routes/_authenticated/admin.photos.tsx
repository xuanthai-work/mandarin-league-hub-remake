import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, useMemo } from "react";
import { AnimatePresence } from "motion/react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { can } from "@/lib/permission-catalog";
import { useAdminAccess } from "./admin";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminDrawer } from "@/components/admin/kit/AdminDrawer";
import { AdminInput } from "@/components/admin/kit/AdminInput";
import { DangerZone } from "@/components/admin/kit/DangerZone";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { FormField } from "@/components/admin/kit/FormField";
import { SegmentedControl } from "@/components/admin/kit/SegmentedControl";
import { StatusPill } from "@/components/admin/kit/StatusPill";
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

  const access = useAdminAccess();
  const canManage = !!access.data && can(access.data.perms, "photos.manage");

  const photos = useQuery({
    queryKey: ["activity-photos", "all"],
    queryFn: listAllPhotos,
    enabled: canManage,
  });

  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "visible" | "hidden">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const suppressClickRef = useRef(false);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

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
  const canReorder = filter === "all" && !busy && pending.length === 0;

  const moveTo = (id: string, target: number) => {
    if (busy || pending.length > 0) return;
    const ids = list.map((p) => p.id);
    const from = ids.indexOf(id);
    if (from < 0 || target === from || target < 0 || target >= ids.length) return;
    const next = arrayMove(list, from, target);
    qc.setQueryData<ActivityPhoto[]>(["activity-photos", "all"], next);
    run(() => reorderPhotos(next.map((p) => p.id)), "Đã cập nhật thứ tự.");
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

  if (access.isLoading) return <p className="p-10 text-center">Đang kiểm tra quyền…</p>;
  if (!canManage)
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <p>Bạn chưa được cấp quyền quản lý ảnh.</p>
        <Button variant="link" onClick={signOut} className="mt-4">
          <LogOut className="mr-1 inline h-4 w-4" />
          Đăng xuất
        </Button>
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
          <Button
            type="button"
            size="admin"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Tải ảnh lên"
            title="Tải ảnh lên"
          >
            <Upload className="h-4 w-4" />
            Tải ảnh lên
          </Button>
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
          {filter === "all"
            ? "Kéo thả để đổi thứ tự. 3 ảnh đang hiện đầu tiên xuất hiện ngay khi khách mở trang chủ."
            : "Chọn Tất cả để kéo thả đổi thứ tự."}
        </p>

        <SegmentedControl
          label="Lọc ảnh theo trạng thái"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `Tất cả (${total})` },
            { value: "visible", label: `Đang hiện (${visibleCount})` },
            { value: "hidden", label: `Đang ẩn (${hiddenCount})` },
          ]}
        />
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
        // eslint-disable-next-line no-restricted-syntax -- vùng kéo thả phủ cả khối, Button của kit không hợp
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
          <EmptyState
            title={
              filter === "visible" ? "Không có ảnh nào đang hiện." : "Không có ảnh nào đang ẩn."
            }
          />
        )}

      {/* Lưới thẻ ảnh */}
      {!photos.isLoading && (filteredList.length > 0 || pending.length > 0) && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragCancel={() => {
            suppressClickRef.current = true;
            setTimeout(() => {
              suppressClickRef.current = false;
            }, 0);
          }}
          onDragEnd={({ active, over }) => {
            suppressClickRef.current = true;
            setTimeout(() => {
              suppressClickRef.current = false;
            }, 0);
            if (!over || active.id === over.id) return;
            const target = list.findIndex((p) => p.id === over.id);
            moveTo(String(active.id), target);
          }}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
            <SortableContext items={filteredList.map((p) => p.id)} strategy={rectSortingStrategy}>
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
                    sortable={canReorder}
                    onOpen={(id) => {
                      if (suppressClickRef.current) return;
                      setOpenId(id);
                    }}
                    onToggle={(item) =>
                      run(
                        () => updatePhoto(item.id, { visible: !item.visible }),
                        item.visible ? "Đã ẩn ảnh." : "Đã hiện ảnh.",
                      )
                    }
                  />
                );
              })}
            </SortableContext>

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
                        <Button
                          type="button"
                          variant="link"
                          className="mt-1 h-auto p-0 text-xs text-destructive hover:text-destructive/80"
                          onClick={() => dismissPending(item.key)}
                        >
                          Bỏ
                        </Button>
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
              // eslint-disable-next-line no-restricted-syntax -- vùng kéo thả phủ cả khối, Button của kit không hợp
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
        </DndContext>
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
            reorderLocked={busy || pending.length > 0}
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
  sortable,
  onOpen,
  onToggle,
}: {
  photo: ActivityPhoto;
  index: number;
  isFeaturedHome: boolean;
  isSelected: boolean;
  busy: boolean;
  sortable: boolean;
  onOpen: (id: string) => void;
  onToggle: (photo: ActivityPhoto) => void;
}) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({
    id: photo.id,
    disabled: !sortable,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      className={`group relative flex flex-col select-none [-webkit-touch-callout:none] ${
        isDragging ? "z-20 opacity-90 cursor-grabbing" : ""
      }`}
    >
      <div
        className={`relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border/70 bg-muted shadow-2xs transition-all hover:border-primary/40 ${
          isSelected ? "ring-2 ring-primary" : ""
        } ${isDragging ? "ring-2 ring-primary shadow-xl" : ""} ${
          sortable && !isDragging ? "sm:cursor-grab" : ""
        }`}
      >
        {/* Nút chính phủ toàn bộ ảnh để mở drawer */}
        {/* eslint-disable-next-line no-restricted-syntax -- nút phủ toàn ảnh để mở drawer, Button của kit không hợp */}
        <button
          type="button"
          onClick={() => onOpen(photo.id)}
          aria-label={`Mở ảnh #${index + 1}`}
          className={`absolute inset-0 z-0 h-full w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            isDragging
              ? "cursor-grabbing"
              : sortable
                ? "cursor-pointer sm:cursor-grab"
                : "cursor-pointer"
          }`}
        >
          {photo.url ? (
            <img
              src={photo.url}
              alt={photo.alt_text || photo.caption}
              draggable={false}
              className={`h-full w-full object-cover transition-transform duration-200 ${
                isDragging ? "" : "group-hover:scale-105"
              } ${photo.visible ? "" : "grayscale opacity-50"}`}
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
        <Button
          type="button"
          variant="outline"
          size="admin-icon"
          disabled={busy}
          aria-label={photo.visible ? "Ẩn khỏi trang chủ" : "Hiện trên trang chủ"}
          title={photo.visible ? "Ẩn khỏi trang chủ" : "Hiện trên trang chủ"}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(photo);
          }}
          className={`absolute right-1.5 top-1.5 z-10 h-7 w-7 rounded-full bg-card/90 backdrop-blur-sm transition-opacity sm:right-2 sm:top-2 sm:h-8 sm:w-8 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 ${
            isDragging ? "invisible pointer-events-none" : ""
          }`}
        >
          {photo.visible ? (
            <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          ) : (
            <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          )}
        </Button>
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
  reorderLocked,
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
  reorderLocked: boolean;
  onClose: () => void;
  onUpdateCaption: (id: string, caption: string) => Promise<void>;
  onToggleVisible: (photo: ActivityPhoto, nextVisible: boolean) => Promise<void>;
  onReplace: (photo: ActivityPhoto, file: File) => Promise<void>;
  onMoveTo: (id: string, target: number) => void;
  onDelete: (photo: ActivityPhoto) => Promise<void>;
}) {
  const [caption, setCaption] = useState(photo.caption);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCaption(photo.caption);
  }, [photo.caption]);

  return (
    <AdminDrawer
      title={`Ảnh #${index + 1}`}
      leading={
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-2 ring-primary/20">
          <ImageIcon className="h-5 w-5" />
        </span>
      }
      subtitle={
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={photo.visible ? "success" : "neutral"}>
            {photo.visible ? "Đang hiện" : "Đang ẩn"}
          </StatusPill>
          <span className="text-xs text-muted-foreground">
            Vị trí {index + 1} / {total}
          </span>
        </div>
      }
      onClose={onClose}
      dismissible={!busy}
    >
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
          <Button
            type="button"
            variant="outline"
            size="admin-sm"
            disabled={busy}
            onClick={() => replaceInputRef.current?.click()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Thay ảnh
          </Button>
        </div>
      </div>

      {/* 2. Chú thích */}
      <FormField
        label="Chú thích"
        hint="Hiện dưới ảnh trên trang chủ và dùng làm mô tả cho trình đọc màn hình."
      >
        {(field) => (
          <div className="flex gap-2">
            <AdminInput
              {...field}
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
              className="flex-1"
            />
            <Button
              type="button"
              size="admin"
              disabled={busy || caption.trim() === (photo.caption ?? "").trim()}
              onClick={() => onUpdateCaption(photo.id, caption.trim())}
            >
              Lưu
            </Button>
          </div>
        )}
      </FormField>

      {/* 3. Hiển thị */}
      <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3">
        <div>
          <p className="text-xs font-semibold text-foreground">Hiện trên trang chủ</p>
          <p className="text-[11px] text-muted-foreground">
            Tắt để tạm ẩn ảnh khỏi trang chủ mà không cần xóa.
          </p>
        </div>
        <Switch
          aria-label="Hiện trên trang chủ"
          disabled={busy}
          checked={photo.visible}
          onCheckedChange={(checked) => onToggleVisible(photo, checked)}
        />
      </div>

      {/* 4. Vị trí */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-foreground">Vị trí trong danh sách</p>
        <div
          role="group"
          aria-label="Vị trí trong danh sách"
          className="flex flex-wrap items-center gap-2"
        >
          <Button
            type="button"
            variant="outline"
            size="admin-sm"
            disabled={reorderLocked || index === 0}
            onClick={() => onMoveTo(photo.id, 0)}
          >
            <ChevronsUp className="h-3.5 w-3.5" />
            Lên đầu
          </Button>
          <Button
            type="button"
            variant="outline"
            size="admin-sm"
            disabled={reorderLocked || index === 0}
            onClick={() => onMoveTo(photo.id, index - 1)}
          >
            <ArrowUp className="h-3.5 w-3.5" />
            Lên
          </Button>
          <Button
            type="button"
            variant="outline"
            size="admin-sm"
            disabled={reorderLocked || index === total - 1}
            onClick={() => onMoveTo(photo.id, index + 1)}
          >
            <ArrowDown className="h-3.5 w-3.5" />
            Xuống
          </Button>
          <Button
            type="button"
            variant="outline"
            size="admin-sm"
            disabled={reorderLocked || index === total - 1}
            onClick={() => onMoveTo(photo.id, total - 1)}
          >
            <ChevronsDown className="h-3.5 w-3.5" />
            Xuống cuối
          </Button>
        </div>
      </div>

      {/* 5. Danger zone xóa ảnh */}
      <DangerZone
        title="Xóa ảnh"
        description="Ảnh sẽ bị xóa vĩnh viễn khỏi kho lưu trữ và không khôi phục được. Muốn tạm gỡ khỏi trang chủ, hãy tắt Hiện trên trang chủ."
        confirmLabel="Xác nhận xóa vĩnh viễn"
        actionLabel="Xóa ảnh"
        onConfirm={() => void onDelete(photo)}
        disabled={busy}
      />
    </AdminDrawer>
  );
}
