import type { PunditId } from "@/lib/pundit/types";
import { punditAvatarModel } from "@/lib/pundit/avatar-model";
import { cn } from "@/lib/utils";

function Motif({ punditId }: { punditId: PunditId }) {
  const shared = {
    stroke: "#f4f6f3",
    strokeWidth: 5,
    strokeLinecap: "round" as const,
    fill: "none",
  };
  switch (punditId) {
    case "zen":
      return <path d="M25 34h50M25 48h34M25 62h42" {...shared} />;
    case "gaffer":
      return (
        <path d="M25 68c8-24 23-35 49-38M61 22l14 8-8 14" strokeLinejoin="round" {...shared} />
      );
    case "stats":
      return <path d="M25 68V52M40 68V38M55 68V46M70 68V27" {...shared} strokeWidth={7} />;
    case "romantic":
      return <path d="M20 57c12-31 30-31 41-6 8 18 19 9 20-10" {...shared} />;
    case "doomer":
      return (
        <path d="M22 31l17 12 14-8 24 32M65 65l12 2-2-12" strokeLinejoin="round" {...shared} />
      );
    case "banter":
      return <path d="M20 55c15-30 45 24 61-8M24 34c13 24 36-21 53 11" {...shared} />;
  }
}

export function PunditAvatar({
  punditId,
  editionSeed,
  className,
  label,
}: {
  punditId: PunditId;
  editionSeed: string;
  className?: string;
  label?: string;
}) {
  const model = punditAvatarModel(editionSeed, punditId);
  return (
    <span
      className={cn(
        "block overflow-hidden rounded-[18px] border border-[color:color-mix(in_oklab,var(--lime)_46%,transparent)] bg-[#091012]",
        className,
      )}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox="0 0 100 100" focusable="false" className="h-full w-full">
        <rect width="100" height="100" rx="22" fill="#091012" />
        <g transform={`rotate(${model.turn} 50 50)`}>
          <circle
            cx="50"
            cy="50"
            r={model.orbit}
            fill="none"
            stroke="#63ff3f"
            strokeWidth="2"
            opacity=".34"
          />
          <path d="M8 78L84 10M18 92L92 24" stroke="#63ff3f" strokeWidth="2" opacity=".16" />
          {model.dots.map((dot, index) => (
            <circle
              key={index}
              cx={dot.x}
              cy={dot.y}
              r={dot.size}
              fill="#63ff3f"
              opacity={dot.opacity}
            />
          ))}
        </g>
        <Motif punditId={punditId} />
      </svg>
    </span>
  );
}
