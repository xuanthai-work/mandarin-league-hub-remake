import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// Refactor admin (roadmap.md): file đã chuyển sang src/components/admin/kit.
// Mỗi task chuyển trang thêm file của mình vào đây; cuối lộ trình đổi sang cả admin.
const ADMIN_KIT_FILES = [
  "src/routes/_authenticated/admin.partners.tsx",
  "src/components/admin/partners/**/*.tsx",
  "src/routes/_authenticated/admin.news.tsx",
  "src/routes/_authenticated/admin.news_.$id.tsx",
  "src/routes/_authenticated/admin.teachers.tsx",
  "src/routes/_authenticated/admin.photos.tsx",
  "src/components/courses/ProgramsAdmin.tsx",
  "src/components/courses/ProgramDrawer.tsx",
  "src/components/courses/TeacherPicker.tsx",
  "src/components/courses/HskClassesAdmin.tsx",
  "src/components/courses/ClassDrawer.tsx",
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
    ignores: ["**/*.test.tsx"],
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
