import { CollectiblePass } from "@/components/pass/collectible-pass";
import { NormalizedPassData, PassThemeId } from "@/components/pass/pass-system";

export function PassExperience({ data, theme = "minimal" }: { data: NormalizedPassData; theme?: PassThemeId }) {
  return (
    <section className="grid w-full justify-items-center" aria-label="Interactive digital event pass">
      <CollectiblePass data={data} theme={theme} />
    </section>
  );
}
