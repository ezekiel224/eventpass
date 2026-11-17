import type { TamaguiBuildOptions } from "@tamagui/core";

export default {
  components: ["tamagui"],
  config: "./tamagui.config.ts",
  themeBuilder: {
    input: "./src/themes/emerald-cyber-themes.input.ts",
    output: "./src/themes/emerald-cyber-themes.generated.ts"
  },
  outputCSS: "./public/tamagui.generated.css"
} satisfies TamaguiBuildOptions;
