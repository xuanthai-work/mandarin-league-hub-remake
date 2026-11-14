# Kế hoạch triển khai hiệu ứng UI (theo phase)

- **Soạn**: BA (Claude), 2026-11-14. **Trạng thái**: DRAFT, chờ User duyệt thứ tự và chọn làn.
- **Căn cứ**: `docs/UI_EFFECTS_CATALOG.md` (danh mục, lý do chọn, ràng buộc). Tài liệu này chỉ nói **làm gì, theo thứ tự nào, kiểm ra sao**.
- **Cách giao việc**: mỗi dòng "Task" bên dưới là một Atomic Task, sẽ được soạn vào slot khi tới lượt (mã `TASK-GE-NNN` hoặc `TASK-OC-NNN`). Mã chưa cấp ở đây.

## Nguyên tắc chung cho mọi phase

1. **Thứ tự theo chi phí**: CSS và thứ đã có trong stack trước, thư viện mới sau.
2. **Mỗi thư viện mới kèm bằng chứng cần thiết**: Dev ghi vào hồ sơ task vì sao đồ có sẵn chưa đủ (đã có mục tương ứng trong catalog).
3. **Mọi hiệu ứng tôn trọng `prefers-reduced-motion`** (xem Phase 0), chỉ animate `transform` và `opacity`.
4. **SSR không lệch hydration**: không dùng `window`, kích thước viewport hay số ngẫu nhiên ở lần render đầu.
5. **Đặt đúng chỗ**: hiệu ứng dùng lại ở admin đặt trong `src/components/admin/kit/` (đã bị `ADMIN_KIT_FILES` lint); hiệu ứng công khai đặt trong `src/components/site/`.
6. **Không trùng file giữa hai làn** khi chạy song song (ghi rõ "Không trùng với" ở mỗi phase).
7. **Cách nghiệm thu mới**: ngoài tsc, lint, test, QA kiểm bằng Playwright trên dev server (`localhost:8080`) và cuối mỗi phase đo bundle khi cần (có thể build theo `CLAUDE.md` mục 2, quy tắc 4, sau khi báo User).
8. **Một phase = một đợt merge**: xong phase thì User xem tay trước khi sang phase sau.

## Hiện trạng cần biết (kiểm 2026-11-14)

- Trang công khai **không** tải `motion`; hiệu ứng ở đó là CSS keyframes (`src/styles.css`: `org-flow`, `crystal-rise`, `badge-sheen`, `tml-*`, `pass-shimmer`, `pass-breathe`, `pass-pop`) kèm `prefers-reduced-motion` cục bộ.
- `motion` chủ yếu ở admin (`AdminDrawer`, `AdminModal`, nhiều trang admin: `AnimatePresence` 85 chỗ).
- `AdminTable` đã có prop `tbodyRef` cho `useAutoAnimate`; mới trang Thành viên dùng.
- Thẻ thành viên dùng `TierBadge.tsx` và các keyframes `pass-*`.
- `package.json` chưa có `@number-flow/react`, `canvas-confetti`, `lenis`.

---

## Phase 0: Nền tảng và quy tắc chung (làm đầu tiên, nhỏ)

**Mục tiêu**: một chỗ duy nhất quyết định "giảm chuyển động", và token thời lượng/easing để các phase sau dùng chung, tránh mỗi nơi một kiểu.

| Task | Nội dung | File dự kiến |
| :-- | :-- | :-- |
| 0.1 Token chuyển động | Thêm biến trong `@theme`: thời lượng (`--duration-fast/base/slow`) và easing (`--ease-out-soft`, `--ease-spring`), tài liệu ngắn trong catalog | `src/styles.css`, `docs/UI_EFFECTS_CATALOG.md` |
| 0.2 Reduced-motion toàn cục | Quy tắc `@media (prefers-reduced-motion: reduce)` ở mức global (rút animation/transition về gần 0 cho lớp hiệu ứng mới), kèm hook dùng chung `useMotionOk()` bọc `useReducedMotion` | `src/styles.css`, `src/lib/use-motion-ok.ts` (+ test) |
| 0.3 `LazyMotion` cho admin | Bọc shell admin bằng `LazyMotion features={domAnimation} strict`, đổi `motion.` thành `m.` ở `AdminDrawer`, `AdminModal` và các file admin đang dùng | `src/components/admin/kit/*`, `src/routes/_authenticated/admin.tsx`, các trang admin có `motion.div` |

- **Phụ thuộc**: không. Kiểm lại thực tế: 0.3 không phụ thuộc 0.1–0.2 (khác file), nên chạy song song.
- **Tiêu chí**: không đổi giao diện; `strict` không báo lỗi; đo kích thước chunk admin trước và sau (ghi số vào hồ sơ).
- **Điều chỉnh sau khảo sát (2026-11-14)**: 0.3 chỉ phải đổi **3 file** (`AdminDrawer`, `AdminModal`, `ContentHistory`) sang `m.div`; khoảng 23 file còn lại chỉ dùng `AnimatePresence` nên không cần đổi.
- **Đã giao**: 0.1 + 0.2 = `TASK-GE-209-MOTION-TOKENS-AND-REDUCED-MOTION` (làn Gemini); 0.3 = `TASK-OC-196-LAZYMOTION-ADMIN` (làn OpenCode). Hai task không trùng file.

## Phase 1: Không tốn KB (CSS và thứ có sẵn)

**Mục tiêu**: cảm giác "liền mạch" toàn site mà chưa thêm thư viện nào.

| Task | Nội dung | File dự kiến |
| :-- | :-- | :-- |
| 1.1 View Transitions | Bật `defaultViewTransition` trong router; thử chuyển trang công khai và giữa các trang admin; kiểm SSR và điều hướng giữa 3 cổng | `src/router.tsx`, `src/styles.css` (tên view-transition) |
| 1.2 Reveal khi cuộn (công khai) | Class tiện ích `reveal-on-scroll` bằng `animation-timeline: view()` trong `@supports`; dự phòng nội dung luôn hiện (không JS). Áp cho các section trang chủ | `src/styles.css`, các file `src/components/site/landing/*Section.tsx` (chỉ thêm class) |
| 1.3 `starting:` cho popover, dropdown, toast | Hiệu ứng vào ra bằng `starting:` + `transition-discrete` cho phần tử chưa có enter/exit mượt (kiểm từng component `ui/*` trước, đa số đã có qua `tw-animate-css`) | `src/components/ui/*` cần thiết |
| 1.4 AutoAnimate cho bảng admin | Áp `useAutoAnimate` qua `tbodyRef` của `AdminTable` cho các bảng lọc nhiều (Ứng viên, Nhiệm vụ dạng bảng, Hoạt động, Tuyển thành viên), theo mẫu trang Thành viên | các trang admin tương ứng |

- **Cập nhật 2026-11-15 sau khảo sát**:
  - **Bỏ task 1.3.** Mọi overlay trong `src/components/ui/*` (dropdown, popover, tooltip, select, dialog, sheet, hover-card, context-menu, menubar, navigation-menu) đã có hiệu ứng vào và ra qua `tw-animate-css`, nên `starting:` không đem lại thêm gì. Có thể xem lại nếu sau này thêm component overlay không đi qua Radix.
  - **1.2 không có phương án dự phòng JS**: trang công khai không tải `motion`, nên trình duyệt chưa hỗ trợ `animation-timeline` chỉ thấy nội dung hiện bình thường (chấp nhận được, không có ẩn nội dung).
  - **1.1 và 1.2 cùng sửa `src/styles.css`**, không chạy song song. 1.1 làm sau khi 1.2 xong.
  - **Đã giao**: 1.2 = `TASK-GE-210-LANDING-REVEAL-ON-SCROLL` (Gemini); 1.4 = `TASK-OC-197-AUTOANIMATE-ADMIN-TABLES` (OpenCode, áp 6 bảng; Kanban không áp).
  - 1.1 View Transitions: API `defaultViewTransition` có trong router đã cài (`@tanstack/router-core` 1.171.34), cần thử với SSR. **Đã giao 2026-11-15** = `TASK-GE-211-VIEW-TRANSITIONS-SITE-PAGES` (Gemini). Phạm vi: chỉ giữa các trang công khai (bộ lọc `pickViewTransitionTypes`), bỏ qua đổi hash/search, header giữ nguyên chỗ, tắt khi reduced-motion. Giới hạn đã biết: trình duyệt có `startViewTransition` nhưng chưa có view-transition-types sẽ bỏ qua bộ lọc và vẫn mờ dần mọi lần điều hướng.
- **Phụ thuộc**: Phase 0 (token, `useMotionOk`).
- **Không trùng với**: 1.2 (site) chạy song song được với 1.4 (admin). 1.1 chạm `router.tsx` và `styles.css`, làm riêng sau 1.2.
- **Tiêu chí**: không có lỗi hydration trong console; tắt khi reduced-motion; 1.2 không ẩn nội dung ở trình duyệt không hỗ trợ.
- **Rủi ro**: 1.1 có thể xung đột với `scrollRestoration` và scroll spy; 1.4 phải kiểm chéo với `dnd-kit` ở Kanban (xem Phase 2), nên không áp cho Kanban ở phase này.
- **Kiểm bằng Playwright**: chuyển trang, lọc bảng, console sạch, bật `prefers-reduced-motion` (Playwright có `emulateMedia`).

## Phase 2: Tab, tương tác admin (dùng `motion` đã có)

| Task | Nội dung | File dự kiến |
| :-- | :-- | :-- |
| 2.1 Vệt sáng trượt theo tab | `layoutId` cho `ui/tabs` và `SegmentedControl` trong admin kit | `src/components/ui/tabs.tsx`, `src/components/admin/kit/SegmentedControl.tsx` |
| 2.2 Kanban mượt | Hiệu ứng thả thẻ và chuyển cột kết hợp `dnd-kit`; **không** dùng `auto-animate` trên cột vì xung đột với `dnd-kit` (xem rủi ro) | `src/components/admin/tasks/TaskKanbanBoard.tsx`, `TaskKanbanCard.tsx` |
| 2.3 Drawer và Modal tinh chỉnh | Dùng token Phase 0 cho thời lượng/easing; focus giữ nguyên | `src/components/admin/kit/AdminDrawer.tsx`, `AdminModal.tsx` |

- **Phụ thuộc**: Phase 0 (đặc biệt 0.3, vì cùng chạm `AdminDrawer`, `AdminModal`).
- **Rủi ro**: Kanban là vùng dễ lỗi nhất (kéo thả, cuộn ngang). Làm 2.2 sau cùng, test kéo thả bằng Playwright, và giữ test hiện có.

## Phase 3: Số liệu và khoảnh khắc ăn mừng (thêm 2 thư viện nhỏ)

| Task | Nội dung | File dự kiến |
| :-- | :-- | :-- |
| 3.1 Cài `@number-flow/react` + component `AnimatedNumber` | Component dùng chung trong admin kit, tự tắt khi reduced-motion, giữ `tabular-nums`, định dạng số theo locale | `package.json`, `src/components/admin/kit/AnimatedNumber.tsx` (+ test) |
| 3.2 Áp NumberFlow | Bảng xếp hạng, thẻ số liệu đóng góp, thống kê Dashboard, điểm trong cổng thành viên | `ContributionsMetrics.tsx`, `LeaderboardPanel.tsx`, `admin.index.tsx`, `member.dashboard.tsx` |
| 3.3 Cài `canvas-confetti` + hook `useCelebrate()` | Import động (lazy), chạy một lần, dọn canvas khi xong, tắt khi reduced-motion | `package.json`, `src/lib/celebrate.ts` (+ test) |
| 3.4 Áp confetti | Duyệt nhiệm vụ xong, cấp tài khoản thành công, thăng hạng thẻ (chỉ ở khoảnh khắc người dùng chủ động tạo ra) | `admin.tasks.tsx`/`TaskDetailModal.tsx`, `admin.members.tsx`, nơi cấp hạng thẻ |

- **Phụ thuộc**: Phase 0. 3.1 và 3.3 là hai task độc lập (cài gói), làm song song được hai làn; 3.2 và 3.4 sau khi gói đã vào `package.json`.
- **Lưu ý `package.json`**: hai làn cùng sửa `package.json` và `pnpm-lock.yaml` sẽ xung đột. **Chỉ một làn cài gói tại một thời điểm.**
- **Tiêu chí**: bundle route admin tăng không quá vài KB gzip (đo trước và sau); số cuộn đúng khi dữ liệu đổi (kiểm bằng cách cộng điểm thử trên dev); confetti không chặn thao tác.
- **Kiểm**: Playwright cộng và trừ điểm (có xin phép ghi DB dev), quan sát số; kiểm bằng mắt confetti.

## Phase 4: Thẻ thành viên (điểm nhấn thương hiệu)

| Task | Nội dung | File dự kiến |
| :-- | :-- | :-- |
| 4.1 Tilt 3D theo chuột và ánh nghiêng | Thẻ nghiêng theo con trỏ trên desktop, tắt trên cảm ứng và khi reduced-motion; không lệch hydration | `TierBadge.tsx` hoặc component thẻ, `src/styles.css` |
| 4.2 Viền sáng (Border Beam) cho hạng cao | Chép component từ Magic UI, chỉnh màu theo tone từng hạng; chỉ hạng cao nhất | cùng khu vực thẻ |

- **Phụ thuộc**: Phase 0. Không phụ thuộc phase 3.
- **Rủi ro**: chạm mã thẻ đã có nhiều keyframes (`pass-shimmer`, `badge-sheen`). Làm theo hướng **thêm lớp**, không viết lại. Không giảm độ tương phản chữ trên thẻ.
- **Kiểm**: chụp ảnh các hạng bằng Playwright, so trước sau.

## Phase 5: Trang công khai nâng cao (chỉ khi User muốn)

| Task | Nội dung | Ghi chú |
| :-- | :-- | :-- |
| 5.1 Lenis cho trang công khai | Bật ở layout công khai, **không** ở `/admin` và cổng thành viên; tương thích scroll spy, neo `scroll-mt-24`, `prefers-reduced-motion` | Làm riêng, kiểm kỹ trên Windows và điều hướng neo |
| 5.2 Hanzi Writer cho trang HSK | Hiển thị nét viết một số chữ Hán ở trang HSK, tải lazy | Chưa tra lại tài liệu; cần spike kiểm khả thi trước |
| 5.3 Hero nâng cao | Chỉ khi có thiết kế: hạt nền (đã có `CrystalParticles`), GSAP hoặc WebGL | Không làm nếu chưa có thiết kế cụ thể |

- **Phụ thuộc**: Phase 0 và Phase 1.2 (reveal khi cuộn, để khỏi chồng hiệu ứng).
- **Rủi ro**: Lenis dễ phá điều hướng neo và scroll spy vừa mới làm. Chạy spike nhỏ trước, đo, rồi mới quyết.

---

## Gợi ý chia làn và thứ tự

| Đợt | Làn Gemini | Làn OpenCode | Ghi chú |
| :-- | :-- | :-- | :-- |
| 1 | 0.1 + 0.2 (token, reduced-motion) | 1.3 (`starting:` cho `ui/*`) | Khác file |
| 2 | 0.3 (`LazyMotion` admin) | 1.2 (reveal trang chủ) | 0.3 chạm admin, 1.2 chạm site |
| 3 | 1.1 (View Transitions) | 1.4 (auto-animate bảng admin) | 1.1 chạm `router.tsx`, 1.4 chạm trang admin |
| 4 | 2.1 + 2.3 (tab, drawer, modal) | 3.1 (cài NumberFlow) | Một làn cài gói |
| 5 | 3.2 (áp NumberFlow) | 3.3 (cài confetti) rồi 3.4 | Làn nào cài gói thì làn kia không sửa `package.json` |
| 6 | 2.2 (Kanban) | 4.1 + 4.2 (thẻ thành viên) | Khác file |
| 7+ | Phase 5 nếu User muốn | | Spike trước |

Đây chỉ là gợi ý. Mỗi đợt nên có bước User xem tay trước khi sang đợt sau. Số làn thực tế do User quyết.

## Việc cần User quyết

1. **Duyệt thứ tự phase** và mức ưu tiên: Phase 3 (số và confetti) và Phase 4 (thẻ thành viên) tạo cảm xúc rõ nhất; Phase 0–1 ít thấy nhưng làm nền.
2. **Phase 5**: có muốn Lenis và Hanzi Writer không, hay để sau.
3. **Cho phép QA đo bundle** bằng `pnpm run build` ở cuối Phase 0 và Phase 3 (build có thể làm crash dev server, tôi sẽ báo trước mỗi lần).
4. **Thử nghiệm trên DB dev**: cho phép tạo dữ liệu thử (`[QA test]`) khi kiểm số liệu và confetti.
