# TASK-OC-184-MOVE-PNPM-SETTINGS-TO-WORKSPACE-YAML

- **Ngày nghiệm thu:** 2026-11-08
- **Dev:** OpenCode (DeepSeek)
- **Kết quả:** PASS (lần 1)

## Bối cảnh & yêu cầu

`.npmrc` chứa hai cấu hình chỉ pnpm hiểu (`minimum-release-age=1440` và danh sách `minimum-release-age-exclude[]`, chặn cài bản package phát hành dưới 24h). Mỗi lệnh `npm` / `npx` trong repo đều báo `npm warn Unknown project config ...`. pnpm 10.32.1 vẫn đọc đúng, nhưng:

- npm bản lớn tiếp theo sẽ coi đây là lỗi;
- pnpm 11 không còn đọc cấu hình pnpm trong `.npmrc`, nên lớp bảo vệ 24h sẽ tắt mà không báo khi nâng pnpm.

Yêu cầu: chuyển hai cấu hình sang `pnpm-workspace.yaml`, xóa `.npmrc`, giữ nguyên hành vi cài đặt.

## Thay đổi

- `pnpm-workspace.yaml` (mới): `minimumReleaseAge: 1440` và `minimumReleaseAgeExclude` với đủ 6 mục cũ (`@tailwindcss/*`, `@napi-rs/*`, `@rolldown/*`, `@esbuild/*`, `@oxc-project/*`, `lightningcss-*`), kèm comment giải thích. Không có khóa `packages` (repo một package).
- `.npmrc`: xóa.
- Không đổi `package.json` (khối `"pnpm"` giữ nguyên), không đổi `pnpm-lock.yaml`.

## Verification gates

| Gate                                               | Kết quả                                     |
| :------------------------------------------------- | :------------------------------------------ |
| `pnpm config get minimumReleaseAge`                | `1440` (QA chạy lại)                        |
| `pnpm config get minimumReleaseAgeExclude --json`  | 6 mục, đúng thứ tự (QA chạy lại)            |
| `npm config get registry`                          | Không còn warning (QA chạy lại)             |
| `pnpm exec prettier --check pnpm-workspace.yaml`   | Pass (Dev)                                  |
| `pnpm exec tsc --noEmit`                           | Exit 0 (Dev)                                |
| lint / test                                        | Không chạy, task không đụng code            |
| build / install                                    | Không chạy (cấm)                            |
