export function LogoMark({ size = 34 }: { size?: number }) {
  const dots: Array<[number, number, string]> = [
    [9, 9, "#4FA97E"], [17, 9, "#4FA97E"], [25, 9, "#E7A917"],
    [9, 17, "#4FA97E"], [17, 17, "#7FC2A2"], [25, 17, "#4FA97E"],
    [9, 25, "#2C99CE"], [17, 25, "#4FA97E"], [25, 25, "#4FA97E"],
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden>
      <rect width="34" height="34" rx="9" fill="#101915" />
      {dots.map(([cx, cy, fill], i) => (
        <circle key={i} cx={cx} cy={cy} r="3.1" fill={fill} />
      ))}
    </svg>
  );
}

export function Logo({ dark }: { dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className={`font-display font-bold text-[17px] tracking-tight ${dark ? "text-paper" : "text-ink"}`}>
          REDEP
        </span>
        <span className={`text-[9.5px] font-medium tracking-[0.14em] uppercase mt-0.5 ${dark ? "text-paper/50" : "text-muted"}`}>
          Education Ecosystem
        </span>
      </span>
    </span>
  );
}
