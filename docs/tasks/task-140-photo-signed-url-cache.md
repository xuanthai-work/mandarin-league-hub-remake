# TASK-140-PHOTO-SIGNED-URL-CACHE

- **Ngày nghiệm thu**: 2026-11-06
- **Kết quả**: **PASS** (lần 1)
- **Dev thực hiện**: Gemini
- **QA**: Claude (làn Gemini)

## 1. Bối cảnh & Yêu cầu

Ảnh hoạt động nằm trong bucket riêng tư `activity-photos`. Mỗi lần lấy danh sách, `withUrls()` ký lại toàn bộ link (`createSignedUrls`, 6 giờ). Supabase trả về link khác mỗi lần, nên trình duyệt tải lại ảnh, không dùng cache:

- Ở `/admin/photos`, mọi ảnh chớp tải lại sau mỗi thao tác.
- Băng chuyền trang chủ tải lại khi khách quay lại tab.

Yêu cầu: dùng lại link đã ký còn hạn, chỉ ký cho ảnh mới, ảnh vừa thay, hoặc link sắp hết hạn. Không đổi quyền, bucket hay migration.

## 2. Thay đổi đã thực hiện

### `src/lib/signed-url-cache.ts` (mới)

- `createSignedUrlCache({ ttlMs, minRemainingMs })` là module thuần, không import Supabase.
- Lưu `Map<path, { url, expiresAt }>`, có các hàm `get`, `set`, `forget`, `split`.
- `get` coi link hết hạn và xóa mục khi `expiresAt - now <= minRemainingMs`.
- `split` tách hit/miss, path trùng chỉ vào miss một lần.
- `set` bỏ qua link rỗng.

### `src/lib/signed-url-cache.test.ts` (mới)

5 ca test:

- Lưu rồi lấy ngay.
- Ngưỡng còn hạn (2 giờ thì dùng lại, 1 giờ thì ký lại).
- `forget` xóa link.
- `split` tách hit/miss và loại path trùng.
- Bỏ qua link rỗng.

### `src/lib/activity-photos.ts`

- Cache cấp module: TTL 6 giờ, ký lại khi còn ≤ 1 giờ.
- `withUrls`:
  - Chỉ dùng cache trên trình duyệt (`typeof window !== "undefined"`). Trên server không giữ link đã ký, vì module có thể dùng chung giữa nhiều request.
  - Chỉ gọi `createSignedUrls` cho path cần ký.
  - Ghép link theo `item.path` thay vì vị trí mảng. Bỏ qua mục lỗi, ảnh đó trả `url: null`.
- `replacePhoto` và `deletePhoto` gọi `urlCache.forget(photo.storage_path)`.
- Chữ ký các hàm export không đổi.

## 3. Verification Gates

| Gate                                                                                                   | Người chạy | Kết quả                         |
| :----------------------------------------------------------------------------------------------------- | :--------- | :------------------------------ |
| `pnpm exec tsc --noEmit`                                                                               | Gemini     | PASS (0 lỗi)                    |
| `pnpm exec eslint src/lib/signed-url-cache.ts src/lib/signed-url-cache.test.ts src/lib/activity-photos.ts` | Gemini | PASS (0 lỗi, 0 cảnh báo)        |
| `pnpm run test`                                                                                        | Gemini     | PASS (23 files, 182 tests, +5)  |

## 4. Ghi chú QA

- Kiểu trả về của `createSignedUrls` (`@supabase/storage-js@2.118.0`: `{ path: string | null, signedUrl: string | null, error: string | null }`) đã được đối chiếu với code.
- User nên kiểm bằng Network tab:
  - Ẩn/hiện hoặc đổi thứ tự ở `/admin/photos`: không có request ảnh mới cho ảnh không đổi.
  - Thay ảnh: ảnh đó hiện ảnh mới.
  - Trang chủ chuyển tab rồi quay lại: không tải lại ảnh.
