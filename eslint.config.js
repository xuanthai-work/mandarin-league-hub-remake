import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// Bộ component admin (src/components/admin/kit): mọi trang và component admin phải dùng kit,
// không viết <button>/<input>/<textarea>/<select>/<table> thô (xem AGENTS.md).
const ADMIN_KIT_FILES = [
  "src/routes/_authenticated/admin*.tsx",
  "src/components/admin/**/*.tsx",
  // Các phần admin của Khóa học nằm ngoài components/admin.
  "src/components/courses/ProgramsAdmin.tsx",
  "src/components/courses/ProgramDrawer.tsx",
  "src/components/courses/TeacherPicker.tsx",
  "src/components/courses/HskClassesAdmin.tsx",
  "src/components/courses/ClassDrawer.tsx",
  "src/components/courses/ReviewDrawer.tsx",
];

// Không áp luật cho: chính bộ kit (được phép dựng từ thẻ thô), file test,
// và modal Điểm danh (giữ nguyên, sẽ thay bằng điểm danh tự động).
const ADMIN_KIT_IGNORES = [
  "**/*.test.tsx",
  "src/components/admin/kit/**",
  "src/components/admin/contributions/AttendanceModal.tsx",
];

export default tseslint.config(
  {
    ignores: ["dist", ".output", ".vinxi", "routeTree.gen.ts", ".remember", ".codegraph"],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ADMIN_KIT_FILES,
    ignores: ADMIN_KIT_IGNORES,
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='button']",
          message:
            "Dùng <Button> của ui/button (size admin / admin-lg / admin-icon) thay cho <button> tự viết.",
        },
        {
          selector:
            "JSXOpeningElement[name.name='input']:not(:has(JSXAttribute[name.name='type'][value.value='file']))",
          message:
            "Dùng AdminInput (kèm FormField) hoặc SearchInput trong src/components/admin/kit thay cho <input> tự viết.",
        },
        {
          selector: "JSXOpeningElement[name.name='textarea']",
          message:
            "Dùng AdminTextarea (kèm FormField) trong src/components/admin/kit thay cho <textarea> tự viết.",
        },
        {
          selector: "JSXOpeningElement[name.name='select']",
          message: "Dùng Select của ui/select thay cho <select> tự viết.",
        },
        {
          selector: "JSXOpeningElement[name.name='table']",
          message: "Dùng AdminTable trong src/components/admin/kit thay cho <table> tự viết.",
        },
      ],
    },
  },
  eslintPluginPrettier,
);
