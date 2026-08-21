import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Formatting is Prettier's job — turn off any rule that would fight it.
  prettier,
  /* Vendored Animate UI components, pulled in by the shadcn CLI and expected to
     be replaced by it rather than edited — any fix applied here would be lost on
     the next `shadcn add`. They trip three of the React Compiler's hook rules by
     construction: the icon controller syncs Motion's `useAnimation` controls
     from an effect, mutates refs during render to track animation generations,
     and `Slot` builds its motion component from `children.type`.
     Scoped to these paths only; nothing hand-written here gets the exemption. */
  {
    files: ["src/components/animate-ui/**", "src/hooks/use-is-in-view.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/static-components": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
