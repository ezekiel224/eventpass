export function PassSurfaceEffects({
  accent,
  light = false
}: {
  accent: string;
  light?: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden="true">
      <div
        className="absolute inset-0 opacity-[0.1]"
        style={{
          backgroundImage: light
            ? "repeating-linear-gradient(112deg,rgba(0,0,0,.05) 0 1px,transparent 1px 5px)"
            : "repeating-linear-gradient(112deg,rgba(255,255,255,.05) 0 1px,transparent 1px 5px)"
        }}
      />
      <div className={`absolute inset-0 ${light ? "bg-[radial-gradient(circle_at_18%_10%,rgba(255,255,255,0.62),transparent_34%),linear-gradient(145deg,transparent_56%,rgba(0,0,0,0.055))]" : "bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.1),transparent_35%),linear-gradient(145deg,transparent_54%,rgba(0,0,0,0.2))]"}`} />
      <div
        className="absolute inset-[7px] rounded-[1.3rem] border"
        style={{
          borderColor: `color-mix(in srgb, ${accent} 18%, transparent)`,
          boxShadow: light
            ? "inset 0 1px rgba(255,255,255,.72), inset 0 -1px rgba(0,0,0,.08)"
            : "inset 0 1px rgba(255,255,255,.13), inset 0 -1px rgba(0,0,0,.42)"
        }}
      />
    </div>
  );
}
