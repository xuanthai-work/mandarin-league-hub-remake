# TML UI Animation & Effects Catalog

> **Mục đích**: Tài liệu này đóng vai trò là kim chỉ nam về hiệu ứng giao diện (UI Animation, Micro-interactions & Visual Effects) cho toàn bộ dự án **Mandarin League Hub (TML Hub)**.
> Mỗi khi phát triển tính năng mới hoặc nâng cấp UI, hãy tham chiếu tài liệu này để lựa chọn giải pháp hiệu ứng tinh tế, mượt mà và tối ưu hiệu năng nhất.

---

## 1. Nền tảng Kỹ thuật (Tech Stack Foundation)

- **Ngôn ngữ**: TypeScript 100%
- **Core Engine**: React 19 + TanStack Start (SSR) + TanStack Router
- **CSS Framework**: Tailwind CSS v4 (`@tailwindcss/vite`, kiến trúc CSS-first)
- **Animation Primitives**: `motion: ^14.5.0` (Framer Motion v14 có sẵn trong dự án)
- **UI Primitives**: Radix UI + shadcn/ui pattern (`clsx`, `tailwind-merge`, `cva`)

---

## 2. Danh mục Thư viện & Công cụ Hiệu ứng Khuyên dùng

### A. Nhóm Copy-Paste Component Registry (Tối ưu cho shadcn & Tailwind v4)

1. **Magic UI** ([magicui.design](https://magicui.design))
   - **Bản chất**: Component registry copy-paste chuẩn shadcn/ui, viết bằng Tailwind CSS và `motion`.
   - **Thành phần nổi bật**:
     - `Border Beam`: Dải ánh sáng chạy quanh viền thẻ/container (cực hợp cho Thẻ thành viên, Card nổi bật).
     - `Meteors` / `Particles`: Hiệu ứng hạt bụi phát sáng hoặc sao băng nền dark theme.
     - `Shimmer Button`: Nút bấm viền ánh kim lướt qua sang trọng.
     - `Number Ticker`: Số nhảy tự động khi xuất hiện trong viewport.
     - `Retro / Animated Grid`: Nền lưới phối cảnh công nghệ cao.

2. **Aceternity UI** ([ui.aceternity.com](https://ui.aceternity.com))
   - **Bản chất**: Hiệu ứng visual cao cấp mang phong cách điện ảnh (Cinematic) và Dark-tech.
   - **Thành phần nổi bật**:
     - `3D Card Effect`: Thẻ nghiêng theo tọa độ chuột với chiều sâu Parallax 3D.
     - `Spotlight` & `Background Beams`: Đèn rọi sân khấu và chùm tia laser nền.
     - `Canvas Reveal Effect`: Hiệu ứng lưới chấm điểm tương tác theo con trỏ chuột.
     - `Lamp Effect`: Đèn tỏa sáng phía trên tiêu đề chính.

3. **React Bits** ([reactbits.dev](https://reactbits.dev))
   - **Bản chất**: Hiệu ứng hạt nền nhẹ, text reveal và micro-animations tối ưu cho React 19.

---

### B. Nhóm Micro-interactions & Dashboard UX (Tối ưu cho Quản trị)

1. **NumberFlow** ([number-flow.barvian.me](https://number-flow.barvian.me)) — `@number-flow/react`
   - **Công dụng**: Chuyển đổi số mượt mà khi tăng/giảm giá trị (như đồng hồ Apple Watch / ứng dụng Revolut).
   - **Ứng dụng**: Điểm cống hiến thành viên, thống kê số lượng nhân sự, số lượng học viên.
   - **Điểm mạnh**: Hỗ trợ chuẩn React 19, cực nhẹ, tự động tính toán font tabular-nums không làm giật layout.

2. **AutoAnimate** ([auto-animate.formkit.com](https://auto-animate.formkit.com)) — `@formkit/auto-animate`
   - **Công dụng**: Tự động tạo chuyển động mượt mà khi thêm, xóa hoặc lọc danh sách/hàng trong bảng.
   - **Ứng dụng**: Bảng danh sách thành viên theo Ban, danh sách ứng viên, hàng nhiệm vụ.
   - **Điểm mạnh**: Chỉ **2KB**, zero-config (chỉ cần gắn 1 ref `useAutoAnimate()` vào thẻ cha là toàn bộ con tự chuyển động mượt).

3. **Animate UI** ([animate-ui.com](https://animate-ui.com))
   - **Công dụng**: Các drop-in components animate mượt cho Radix UI (Dropdown menu, Dialog trượt, Tooltip đàn hồi).

---

### C. Nhóm Motion Engine & Scrolling

1. **Motion v14 (`motion`)** — _Đã có sẵn trong dự án_
   - Dùng cho các hiệu ứng chuyển đổi trạng thái layout phức tạp với `layoutId` (chuyển tab trượt vệt sáng, modal mở rộng).
   - Gestures: Hover scale, tap depression, drag & drop.

2. **Lenis** (`lenis`)
   - Cuộn trang siêu mượt (Smooth Scrolling), nâng tầm trải nghiệm cho Cổng công khai (Trang chủ, Khóa học HSK, Giới thiệu).

---

### D. Nhóm Thưởng & Gamification (Visual Delight)

1. **Canvas Confetti** (`canvas-confetti`)
   - Pháo hoa giấy bắn ăn mừng khi: Thành viên thăng hạng thẻ Smart Pass (lên Gold/Black), Cấp tài khoản nội bộ thành công, Hoàn thành nhiệm vụ đạt mốc điểm.

---

## 3. Ma trận Gợi ý Hiệu ứng theo Tính năng của TML Hub

| Phân hệ / Tính năng               | Hiệu ứng đề xuất                                   | Thư viện / Công nghệ                                        | Mục đích trải nghiệm                                     |
| :-------------------------------- | :------------------------------------------------- | :---------------------------------------------------------- | :------------------------------------------------------- |
| **Thẻ Thành viên (Smart Pass)**   | 3D Tilt Card, Hologram Sheen, Border Beam          | CSS 3D Preserve + Motion + Magic UI                         | Thể hiện đẳng cấp thẻ điện tử, tự hào thành viên         |
| **Bảng Thành viên / Nhân sự**     | Smooth filter / Row transition, Custom Scrollbar   | AutoAnimate (`@formkit/auto-animate`) + `.custom-scrollbar` | Lọc ban và tìm kiếm không bị giật, cuộn ngang thanh mảnh |
| **Điểm cống hiến & Thống kê**     | Animated Number Ticker                             | NumberFlow (`@number-flow/react`)                           | Số nhảy mượt như bảng điện tử khi được cộng/trừ điểm     |
| **Nhiệm vụ / Cấp tài khoản**      | Pháo hoa giấy ăn mừng (Celebration)                | `canvas-confetti`                                           | Tạo cảm xúc phấn khởi khi hoàn thành công việc           |
| **Hero Sections / Landing Pages** | Spotlight, Animated Beams, Shimmer Text            | Aceternity UI + Magic UI                                    | Ấn tượng thị giác mạnh mẽ ngay từ cái nhìn đầu tiên      |
| **Bộ lọc Tabs & Navigation**      | Shared layout transition (Vệt sáng trượt theo tab) | Motion `layoutId`                                           | Chuyển đổi tab liền mạch, định vị rõ ngữ cảnh            |
| **Modal / Drawer Slide-over**     | Backdrop kính quang học + Smooth ease-out slide    | CSS `backdrop-blur-sm bg-black/15` + Radix Dialog           | Không bị đục sương mù, mở mượt mà không che lấp nền      |

---

## 4. Nguyên tắc Thiết kế Hiệu ứng (Executive Craftsmanship & Anti-Slop)

1. **Chất lượng hơn số lượng (Subtle & Purposeful)**: Hiệu ứng chỉ được đưa vào để phục vụ trải nghiệm người dùng (chỉ dẫn hướng chú ý, phản hồi thao tác), không lạm dụng làm rối mắt.
2. **Hiệu năng là trên hết (60-120fps)**: Chỉ animate các thuộc tính GPU-accelerated (`transform`, `opacity`), hạn chế animate `width`, `height`, `left`, `top` gây layout thrashing.
3. **Tôn trọng người dùng**: Luôn hỗ trợ media query `@media (prefers-reduced-motion: reduce)` để tắt bớt chuyển động cho người nhạy cảm thị giác.
4. **Quy trình phối hợp**: Trước khi implement một tính năng có yếu tố tương tác thị giác, BA và Developer cùng mở bảng ma trận trên để chọn giải pháp tốt nhất.
