export function MiniPieChart({ billable, total }: { billable: number; total: number }) {
  const r = 20;
  const cx = 28;
  const cy = 28;
  const circumference = 2 * Math.PI * r;
  const billableLen = total > 0 ? (billable / total) * circumference : 0;
  const label = total % 1 === 0 ? `${total}h` : `${total.toFixed(1)}h`;

  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#166534" strokeWidth="9" />
      {billableLen > 0 && (
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#1d4ed8"
          strokeWidth="9"
          strokeDasharray={`${billableLen} ${circumference}`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      )}
      <text
        x={cx} y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="9"
        fontWeight="700"
        fill="white"
      >
        {label}
      </text>
    </svg>
  );
}
