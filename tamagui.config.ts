import { animationsCSS } from "@tamagui/config/animations-css";
import { createV6Config } from "@tamagui/config/v6-base";
import { createTamagui } from "tamagui";
import { emeraldCyberColorTokens } from "./src/themes/emerald-cyber-colors";
import { themes } from "./src/themes/emerald-cyber-themes.generated";

const emeraldCyberConfig = createV6Config({
  themes,
  colorTokens: emeraldCyberColorTokens,
});

export const config = createTamagui({
  ...emeraldCyberConfig,
  animations: animationsCSS
});

export type AppConfig = typeof config;

declare module "tamagui" {
  // Tamagui reads this declaration merge to expose the app config to component props.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
