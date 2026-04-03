interface PageBannerProps {
  title: string;
  subtitle: string;
  accentFrom: string; // HSL color for gradient start, e.g. "hsl(0, 72%, 51%)"
  accentTo: string;   // HSL color for gradient end
  gradientFrom?: string; // CSS class for left gradient
  gradientTo?: string;   // CSS class for right gradient
}

const PageBanner = ({ title, subtitle, accentFrom, accentTo, gradientFrom, gradientTo }: PageBannerProps) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/10 bg-card/80">
      <svg className="absolute inset-0 w-full h-full opacity-[0.35]" viewBox="0 0 1000 200" preserveAspectRatio="none">
        {[40, 95, 150, 205, 260, 315, 370, 425, 480, 535, 590, 645, 700, 755, 810, 865, 920].map((x, i) => {
          const heights = [60, 45, 80, 35, 70, 90, 50, 65, 40, 85, 55, 75, 30, 60, 45, 70, 55];
          const tops = [70, 85, 50, 95, 60, 30, 80, 65, 90, 45, 75, 55, 100, 70, 85, 50, 75];
          const useFirst = i % 3 !== 0;
          return (
            <g key={i}>
              <line x1={x} y1={tops[i] - 15} x2={x} y2={tops[i] + heights[i] + 15} stroke={useFirst ? accentFrom : accentTo} strokeWidth="1" opacity="0.3" />
              <rect x={x - 8} y={tops[i]} width="16" height={heights[i]} fill={useFirst ? accentFrom : accentTo} rx="1" opacity="0.2" />
            </g>
          );
        })}
      </svg>
      <div className={`absolute inset-0 bg-gradient-to-r ${gradientFrom || "from-primary/5"} via-transparent ${gradientTo || "to-accent/5"}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />

      <div className="relative px-6 py-7 lg:py-8">
        <div className="flex items-center gap-3">
          <div
            className="w-1.5 h-10 rounded-full"
            style={{ background: `linear-gradient(to bottom, ${accentFrom}, ${accentTo})` }}
          />
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-[0.15em] uppercase bg-gradient-to-r from-foreground via-foreground to-foreground/50 bg-clip-text text-transparent">
              {title}
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] font-semibold mt-0.5" style={{ color: accentFrom }}>
              {subtitle}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageBanner;
