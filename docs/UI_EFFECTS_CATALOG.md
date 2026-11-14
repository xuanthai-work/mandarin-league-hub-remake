# TML UI Animation & Effects Catalog

> **Mục đích**: Kim chỉ nam về hiệu ứng giao diện (UI animation, micro-interactions, visual effects) cho dự án **Mandarin League Hub (TML Hub)**.
> Mỗi khi làm tính năng mới hoặc nâng cấp UI, tham chiếu tài liệu này để chọn giải pháp tinh tế, mượt và nhẹ nhất.
>
> **Nguyên tắc chọn**: dùng cái đã có trong stack trước (CSS hiện đại, `motion`, `auto-animate`); chỉ thêm thư viện khi nêu được lý do cụ thể mà đồ có sẵn không làm tốt. Mỗi thư viện đề xuất bên dưới đều có mục "Vì sao chưa đủ với đồ có sẵn".
>
> **Lịch sử**: bản gộp 2026-11-14 từ hai báo cáo nghiên cứu (báo cáo của đồng nghiệp và bản của BA ngày 2026-11-10). Mục nào chưa kiểm lại nguồn được đánh dấu _(chưa kiểm)_.

---

## 1. Nền tảng kỹ thuật và hiện trạng

- **Ngôn ngữ**: TypeScript 100%.
- **Core**: React 19 + TanStack Start (SSR, Vite) + TanStack Router.
- **CSS**: Tailwind CSS v4 (`@tailwindcss/vite`, cấu hình CSS-first qua `@theme`).
- **UI primitives**: Radix UI + shadcn/ui (`clsx`, `tailwind-merge`, `cva`).

### 1.1. Thư viện hiệu ứng đã cài (kiểm `package.json` và `src/`, 2026-11-14)

| Gói | Phiên bản | Dùng ở đâu hiện nay | Nhận xét |
| :-- | :-- | :-- | :-- |
| `motion` | ^14.5.0 | 26 file import | Dùng nhiều, nhưng **chưa có `LazyMotion`** nên kéo bản đầy đủ |
| `@formkit/auto-animate` | ^0.10.0 | 1 file | Gần như chưa tận dụng, hợp với bảng và Kanban |
| `tw-animate-css` | ^1.3.4 | lớp tiện ích Tailwind | Keyframes nền (enter/exit cho Radix) |
| `embla-carousel-react` | ^8.6.0 | 1 file (carousel) | Đủ dùng |
| `@dnd-kit/core`, `@dnd-kit/sortable` | ^6.3.1, ^10.0.0 | 2 file (Kanban) | Kéo thả |

Số liệu hỗ trợ khác: `prefers-reduced-motion` mới xuất hiện ở 2 file, `tabular-nums` ở 15 file.

### 1.2. Chưa cài, tài liệu này đề xuất xem xét

`@number-flow/react`, `canvas-confetti`, `lenis`, và tùy trường hợp: GSAP, `hanzi-writer`, Rive hoặc dotLottie, WebGL (OGL hoặc three).

---

## 2. Nhóm 0: Không tốn thêm KB, nên làm trước

Các việc này dùng thứ đã có trong trình duyệt hoặc trong stack. Lý do xếp đầu: chi phí gần bằng 0, rủi ro thấp, và là câu trả lời cho câu hỏi "có cần thêm thư viện không".

### 2.1. View Transitions của TanStack Router (chuyển trang)

- Bật `defaultViewTransition: true` trong `createRouter` (`src/router.tsx`). Router có tùy chọn `types` để chuyển hướng trượt trái hoặc phải theo hướng điều hướng.
- Cần thử với SSR của TanStack Start và với việc chuyển giữa 3 cổng (main, join, member) có điều hướng toàn trang.
- Nguồn: https://tanstack.com/router/latest/docs/framework/react/examples/view-transitions

### 2.2. Mở, đóng dropdown, popover, toast bằng Tailwind v4 thuần

- Dùng biến thể `starting:` cùng `transition-discrete` (CSS `@starting-style`, `transition-behavior: allow-discrete`). Làm được hiệu ứng vào và ra cho phần tử đi qua `display: none`, không cần JS.
- Giới hạn: phần tử bị **React gỡ khỏi DOM** (render có điều kiện) thì CSS không giữ lại để chạy hiệu ứng thoát. Trường hợp đó cần `AnimatePresence` của `motion` (xem 3.1).
- Phù hợp để thay dần các animation viết tay.
- Nguồn: https://tailwindcss.com/docs/transition-behavior

### 2.3. Hiện ra khi cuộn bằng CSS (`animation-timeline: view()`)

- Có thể làm hiệu ứng reveal khi cuộn không cần thư viện. Hỗ trợ trình duyệt chưa đồng nhất, các nguồn mâu thuẫn về Safari _(chưa kiểm)_.
- Bắt buộc bọc trong `@supports (animation-timeline: view())` và dùng `whileInView` của `motion` làm phương án dự phòng.
- Nguồn: https://modern-css.com/scroll-linked-animations-without-a-library/

### 2.4. Dùng đúng phần `motion` đã có

- `layoutId` cho vệt sáng trượt theo tab, `AnimatePresence` cho drawer và modal, `useReducedMotion` cho người nhạy cảm chuyển động.
- **Giảm bundle bằng `LazyMotion` với `domAnimation`**: bản React đầy đủ khoảng 32 KB gzip _(chưa kiểm số liệu)_. Chi phí cần tính: 26 file đang dùng `motion.xxx` phải đổi sang `m.xxx`, và nên bật chế độ `strict` để chặn dùng nhầm. Nên làm thành một task riêng, ưu tiên các trang công khai.
- Dùng thêm `@formkit/auto-animate` (đã cài) cho bảng và Kanban trước khi nghĩ tới thư viện khác.

---

## 3. Nhóm 1: Thư viện nên thêm, kèm lý do

### 3.1. Nền tảng chuyển động: `motion` + `@formkit/auto-animate` (đã có)

- **`motion`**: trục chính cho chuyển động phức tạp trong React: `layoutId` (thanh trượt tab, thẻ mở rộng), `AnimatePresence` (hiệu ứng thoát), gesture và kéo thả có độ đàn hồi.
- **`@formkit/auto-animate`** (~2 KB): gắn `useAutoAnimate()` vào thẻ cha của danh sách. Thêm, xóa, lọc, sắp xếp đều tự trượt mượt, không cấu hình.
- **Vì sao không dùng riêng Tailwind/CSS cho các việc này**:
  - **Exit animation** của phần tử React bị gỡ: CSS không giữ phần tử lại trong DOM, tự làm dễ lỗi (xem giới hạn ở 2.2).
  - **Chuyển động đổi hướng liên tục** (spring physics): CSS dùng thời lượng cố định, hiệu ứng bị khựng khi người dùng đổi ý giữa chừng.
  - **Layout động**: CSS không tự tính chuyển vị trí và kích thước khi layout đổi; `motion` làm qua `layoutId` và kỹ thuật FLIP.

### 3.2. Hiển thị số liệu: `@number-flow/react`

- **Công dụng**: số trượt dọc từng hàng đơn vị khi tăng, giảm, giống đồng hồ cơ hoặc app ngân hàng.
- **Ứng dụng**: điểm đóng góp, bục vinh danh, số hồ sơ, thống kê Dashboard.
- **Vì sao chưa đủ với đồ có sẵn**:
  - Tự làm bằng `motion` (đếm số rồi cập nhật) làm được hiệu ứng "nhảy số", nhưng **không có hiệu ứng cuộn riêng từng chữ số**, và phải tự xử lý định dạng số, dấu phẩy, tiền tệ, đổi locale.
  - Lưu ý: giữ độ rộng chữ số thì `tabular-nums` (đã dùng ở 15 file) đã giải quyết được. Lý do cần NumberFlow là **chất lượng chuyển động và tiết kiệm công viết**, không phải chống layout shift.
- Cân nhắc: số cuộn trong Dashboard admin chỉ nên dùng ở vài chỉ số chính, tránh làm rối mắt.

### 3.3. Phần thưởng: `canvas-confetti`

- **Công dụng**: bắn pháo giấy khi có cột mốc: thăng hạng thẻ, cấp tài khoản thành công, duyệt xong nhiệm vụ.
- **Vì sao chưa đủ với đồ có sẵn**: `motion` render mọi thứ bằng thẻ DOM. Hàng trăm hạt sẽ làm cây DOM phình đột ngột, tăng áp lực lên bộ nhớ và giật trên điện thoại. `canvas-confetti` (~6 KB) vẽ lên một `<canvas>` riêng nằm ngoài cây DOM của React và tự hủy canvas khi xong.
- Dùng canvas 2D, **không phải GPU trực tiếp** như một số mô tả. Ý chính (ngoài DOM) vẫn đúng.

### 3.4. Cuộn mượt: `lenis` (chỉ trang công khai)

- **Công dụng**: chuẩn hóa cuộn bằng chuột, bỏ cảm giác khựng theo từng nấc, đặc biệt trên Windows _(chưa kiểm cụ thể)_. Lõi nhỏ, khoảng 3.8 KB _(chưa kiểm)_.
- **Vì sao chưa đủ với đồ có sẵn**: `motion`, `auto-animate` và `embla` chỉ xử lý chuyển động trong từng component, không kiểm soát cơ chế cuộn tổng thể của trình duyệt. CSS `scroll-behavior: smooth` chỉ làm mượt khi cuộn tới neo, không làm mượt thao tác lăn chuột.
- **Ranh giới áp dụng**:
  - Chỉ bật ở cổng công khai (trang chủ, giới thiệu, khóa học). **Tuyệt đối không bật ở `/admin`**: khu vực xử lý dữ liệu cần phản hồi cuộn 1:1, quán tính trễ gây khó chịu và dễ xung đột với drawer và khôi phục vị trí cuộn.
  - **Rủi ro cần kiểm khi làm**: trang chủ đã có scroll spy (`use-scroll-spy`) và điều hướng neo (`scroll-mt-24`). Lenis phải tương thích với cả hai, kèm tôn trọng `prefers-reduced-motion`.

### 3.5. GSAP (chỉ khi có kịch bản hero phức tạp)

- Theo các nguồn đọc được, GSAP đã miễn phí hoàn toàn (gồm SplitText, ScrollTrigger, Flip) từ bản 3.13 nhờ Webflow _(chưa kiểm nguồn gốc)_. Lõi khoảng 23 KB, ScrollTrigger thêm khoảng 7 KB.
- **Vì sao chưa đủ với đồ có sẵn**: `motion` đủ cho đa số chuyển động UI, nhưng timeline nhiều bước, pinned section và hiệu ứng tách chữ phức tạp là thế mạnh của GSAP.
- Chỉ nên thêm khi có thiết kế cụ thể. Dùng với React qua hook `useGSAP` để tự dọn dẹp.
- Nguồn: https://gsap.com/resources/React/

---

## 4. Nhóm 2: Component registry copy-paste

Mô hình giống shadcn/ui: **chép mã nguồn của đúng component cần dùng vào repo**, không cài cả gói UI nguyên khối. Lý do: bundle chỉ chứa phần thật sự dùng, và sửa tùy ý được (phù hợp lint nghiêm ở admin).

1. **Magic UI** ([magicui.design](https://magicui.design)): viết bằng Tailwind và `motion`. Hợp để lấy:
   - `Border Beam`: dải sáng chạy quanh viền thẻ (Thẻ thành viên, card nổi bật).
   - `Shimmer Button`: nút có vệt sáng lướt qua.
   - `Particles` / `Meteors`, `Retro / Animated Grid`: nền hạt, nền lưới.
   - `Number Ticker`: số nhảy khi vào viewport (trùng chức năng với NumberFlow; chọn một).
2. **Aceternity UI** ([ui.aceternity.com](https://ui.aceternity.com)): hiệu ứng chiều sâu như `3D Card Effect` (thẻ nghiêng theo chuột, hợp thẻ hội viên), `Spotlight`, `Background Beams`, `Lamp Effect`. Mạnh ở **giao diện nền tối**; theme TML hiện nay chủ yếu sáng, nên dùng như nguồn ý tưởng và chỉnh lại màu, không chép nguyên.
3. **React Bits** ([reactbits.dev](https://reactbits.dev)): hạt nền, text reveal, micro-animation.
4. **Animate UI** ([animate-ui.com](https://animate-ui.com)): bản animate sẵn cho primitives Radix (dropdown, dialog, tooltip).

**Vì sao không tự viết hết**: các hiệu ứng này (viền sáng, thẻ 3D, hạt nền) tốn nhiều công tinh chỉnh. Chép mã đã có giúp tiết kiệm công. Cái giá cần chấp nhận: mỗi file chép về là mã của dự án, phải qua `ADMIN_KIT_FILES` nếu đặt ở admin, phải kiểm hydration và `prefers-reduced-motion`.

---

## 5. Nhóm 3: Ấn tượng nhất nhưng nặng hoặc tốn công (làm sau)

- **`hanzi-writer`**: hiển thị nét viết từng chữ Hán. Hợp thương hiệu nhất cho trang HSK và trang xác minh chứng chỉ _(ý tưởng chưa tra lại tài liệu)_.
- **Rive hoặc dotLottie**: linh vật, trạng thái rỗng, hoạt hình tương tác (Rive có state machine). dotLottie nhỏ hơn Lottie JSON.
- **WebGL (OGL hoặc three)**: nền hero, ví dụ gợn sóng trống đồng. Phải tải lazy, chỉ ở trang chủ, và có phương án thay thế khi bật reduced-motion.
- **Hiệu ứng viết thư pháp bằng SVG `stroke-dashoffset`**: không cần thư viện, chỉ cần tài nguyên SVG.

---

## 6. Ma trận gợi ý theo tính năng

| Phân hệ / Tính năng | Hiệu ứng đề xuất | Công nghệ | Mục đích trải nghiệm |
| :-- | :-- | :-- | :-- |
| Chuyển trang (toàn site) | View Transition, trượt theo hướng | TanStack Router `defaultViewTransition` | Điều hướng liền mạch, 0 KB |
| Dropdown, popover, toast | Fade/scale vào ra | Tailwind `starting:` + `transition-discrete` | Mượt, không JS, 0 KB |
| Hiện nội dung khi cuộn (công khai) | Reveal theo cuộn | CSS `animation-timeline: view()` với dự phòng `motion` `whileInView` | Trang chủ sinh động, nhẹ |
| Thẻ thành viên (Smart Pass) | 3D Tilt, Hologram Sheen, Border Beam | CSS 3D + `motion` + Magic UI / Aceternity | Thể hiện đẳng cấp thẻ điện tử |
| Bảng thành viên, Kanban | Chuyển hàng khi lọc, thêm, xóa | `@formkit/auto-animate` (đã cài) | Lọc không giật |
| Điểm đóng góp, thống kê | Số cuộn từng hàng | `@number-flow/react` | Cộng, trừ điểm sinh động |
| Nhiệm vụ duyệt, cấp tài khoản, lên hạng | Pháo giấy | `canvas-confetti` | Cảm xúc hoàn thành |
| Hero, landing công khai | Spotlight, Beams, Shimmer | Aceternity + Magic UI (chỉnh màu sáng) | Ấn tượng ban đầu |
| Tabs, điều hướng | Vệt sáng trượt theo tab | `motion` `layoutId` | Định vị ngữ cảnh |
| Modal, Drawer | Kính mờ nền và trượt ease-out | `backdrop-blur-sm bg-black/15` + Radix Dialog | Mở mượt, không che nền |
| Cuộn cổng công khai | Cuộn mượt | `lenis` (không bật ở admin) | Cảm giác cao cấp |
| Trang HSK, xác minh chứng chỉ | Nét viết chữ Hán | `hanzi-writer` | Gắn với thương hiệu |

---

## 7. Ràng buộc từ dự án

- **SSR**: server và client phải render giống nhau, tránh lỗi hydration (xem quy ước i18n trong `AGENTS.md`). Hiệu ứng phụ thuộc kích thước viewport, `window` hay số ngẫu nhiên phải chạy sau khi mount.
- **Admin bị lint nghiêm** qua `ADMIN_KIT_FILES`: hiệu ứng dùng chung đặt trong `src/components/admin/kit/`, không dùng `<button>`, `<input>`, `<table>` thô.
- **Hiệu năng**: chỉ animate `transform` và `opacity`. Tránh animate `width`, `height`, `left`, `top`.
- **Tôn trọng người dùng**: mọi hiệu ứng phải tắt hoặc giảm khi có `prefers-reduced-motion: reduce`. Hiện mới 2 file xử lý, nên bổ sung ở lớp dùng chung.
- **Bundle**: `motion` cộng GSAP cộng Lenis có thể vượt khoảng 70 KB _(chưa đo)_. Chia code theo route công khai và admin, tải lazy các thứ nặng.
- **Nguyên tắc dùng**: hiệu ứng phải phục vụ trải nghiệm (chỉ hướng chú ý, phản hồi thao tác), không lạm dụng.

---

## 8. Thứ tự đề xuất

1. **Nhóm 0 (0 KB)**: View Transitions, `starting:` cho dropdown và popover, dùng `auto-animate` cho bảng và Kanban.
2. **Giảm bundle**: `LazyMotion` cho các trang công khai (task riêng, đổi `motion.` thành `m.`).
3. **Nhóm 1 cho cổng thành viên và đóng góp**: NumberFlow, `canvas-confetti`.
4. **Nhóm 2 cho giao diện nổi bật**: Border Beam, 3D Card cho thẻ thành viên (chép từng component, kiểm theme sáng).
5. **`hanzi-writer`** cho trang HSK.
6. **Lenis, GSAP, WebGL** chỉ khi có thiết kế hero cụ thể, và đo ảnh hưởng đến scroll spy và hydration trước.

Quy trình phối hợp: trước khi làm tính năng có yếu tố tương tác thị giác, BA và Dev mở bảng ma trận mục 6 để chọn giải pháp, ưu tiên nhóm 0.

---

## 9. Nguồn tham khảo

- https://tanstack.com/router/latest/docs/framework/react/examples/view-transitions
- https://tailwindcss.com/blog/tailwindcss-v4
- https://tailwindcss.com/docs/transition-behavior
- https://modern-css.com/scroll-linked-animations-without-a-library/
- https://caniuse.com/mdn-css_properties_animation-timeline_scroll
- https://gsap.com/resources/React/
- https://webflow.com/updates/gsap-becomes-free
- https://www.pkgpulse.com/guides/best-react-animation-libraries-2026
- https://annnimate.com/compare/best-animation-libraries
- https://number-flow.barvian.me, https://magicui.design, https://ui.aceternity.com, https://reactbits.dev, https://animate-ui.com
