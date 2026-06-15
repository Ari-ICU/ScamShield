"use client";

interface BarChartProps {
  data: { label: string; value: number }[];
}

export function BarChart({ data }: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-4">
      {data.map((item, index) => {
        const percentage = (item.value / maxValue) * 100;
        return (
          <div key={index} className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">{item.label}</span>
              <span className="text-red-400 font-mono">{item.value} reports</span>
            </div>
            <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface LineChartProps {
  data: { label: string; value: number }[];
}

export function LineChart({ data }: LineChartProps) {
  const width = 500;
  const height = 200;
  const padding = 30;

  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  // Calculate points coordinates
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - (d.value / maxValue) * chartHeight;
    return { x, y, label: d.label, value: d.value };
  });

  const pathD = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ""
  );

  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : "";

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
          const y = padding + r * chartHeight;
          return (
            <line
              key={i}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Gradient Area */}
        {areaD && <path d={areaD} fill="url(#chart-gradient)" />}

        {/* Line */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="url(#line-grad)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}
        <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>

        {/* Dots */}
        {points.map((p, i) => (
          <g key={i} className="group cursor-pointer">
            <circle
              cx={p.x}
              cy={p.y}
              r="4"
              className="fill-slate-950 stroke-orange-500 stroke-2 hover:r-6 transition-all duration-200"
            />
            {/* Tooltip on hover (simplified SVG title tooltips) */}
            <title>{`${p.label}: ${p.value} reports`}</title>
          </g>
        ))}

        {/* X Axis Labels */}
        {points.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={height - 10}
            textAnchor="middle"
            className="fill-slate-500 text-[10px] font-semibold"
          >
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
