/* Sparkline — small inline line chart */
interface SparklineProps {
  data: number[];
  w?: number;
  h?: number;
  color?: string;
}
export function Sparkline({ data, w = 84, h = 32, color = 'var(--accent)' }: SparklineProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const dx = w / (data.length - 1);
  const points = data.map((v, i) => [i * dx, h - ((v - min) / (max - min || 1)) * (h - 4) - 2] as [number, number]);
  const path = points.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const area = path + ` L ${w},${h} L 0,${h} Z`;
  const id = 'sp-' + Math.random().toString(36).slice(2, 7);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="3" fill={color} />
    </svg>
  );
}

/* Line chart with grid + projection */
interface LineChartProps {
  w?: number;
  h?: number;
  entradas: number[];
  saidas: number[];
  projection?: number[];
}
export function LineChart({ w = 760, h = 240, entradas, saidas, projection }: LineChartProps) {
  const pad = { l: 44, r: 16, t: 16, b: 28 };
  const inner = { w: w - pad.l - pad.r, h: h - pad.t - pad.b };
  const all = [...entradas, ...saidas, ...(projection || [])];
  const max = Math.ceil(Math.max(...all) / 1000) * 1000;
  const dx = inner.w / (entradas.length - 1);
  const y = (v: number) => pad.t + inner.h - (v / max) * inner.h;
  const x = (i: number) => pad.l + i * dx;
  const pathStr = (arr: number[]) => arr.map((v, i) => (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ');
  const areaStr = (arr: number[]) => pathStr(arr) + ` L ${x(arr.length - 1).toFixed(1)},${pad.t + inner.h} L ${pad.l},${pad.t + inner.h} Z`;
  const fmt = (v: number) => 'R$' + (v / 1000).toFixed(0) + 'k';
  const days = entradas.length;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', maxWidth: '100%' }}>
      <defs>
        <linearGradient id="ent-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--green-500)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--green-500)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
        const yy = pad.t + inner.h * (1 - p);
        return (
          <g key={i}>
            <line x1={pad.l} x2={pad.l + inner.w} y1={yy} y2={yy} stroke="var(--border)" />
            <text x={pad.l - 8} y={yy + 4} fontSize="10" fill="var(--ink-3)" textAnchor="end" fontFamily="var(--mono)">{fmt(max * p)}</text>
          </g>
        );
      })}
      {[0, 7, 14, 21, days - 1].map((i) => (
        <text key={i} x={x(i)} y={h - 8} fontSize="10" fill="var(--ink-3)" textAnchor="middle" fontFamily="var(--mono)">D{i + 1}</text>
      ))}
      <path d={areaStr(entradas)} fill="url(#ent-fill)" />
      <path d={pathStr(entradas)} fill="none" stroke="var(--green-500)" strokeWidth="2.2" strokeLinecap="round" />
      <path d={pathStr(saidas)} fill="none" stroke="var(--red-500)" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      {projection && <path d={pathStr(projection)} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" />}
      <line x1={x(days - 1)} x2={x(days - 1)} y1={pad.t} y2={pad.t + inner.h} stroke="var(--accent)" strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
      <circle cx={x(days - 1)} cy={y(entradas[entradas.length - 1])} r="4" fill="var(--green-500)" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

/* Funnel chart */
interface FunnelStage {
  label: string;
  count: number;
  color: string;
}
export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const max = stages[0].count;
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {stages.map((s, i) => {
        const pct = (s.count / max) * 100;
        const conv = i === 0 ? 100 : (s.count / stages[i - 1].count) * 100;
        return (
          <div key={s.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
              <span style={{ fontWeight: 800, color: 'var(--ink-2)' }}>
                <span className="dot-status" style={{ background: s.color }} />
                {s.label}
              </span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                <strong>{s.count}</strong>
                <span style={{ color: 'var(--ink-3)', marginLeft: 8, fontWeight: 700 }}>
                  {i === 0 ? `${Math.round((s.count / max) * 100)}%` : `→ ${conv.toFixed(0)}%`}
                </span>
              </span>
            </div>
            <div style={{ height: 22, background: 'var(--surface-3)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${s.color}, color-mix(in oklab, ${s.color} 70%, white))`, borderRadius: 6, transition: 'width 0.4s' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Bar chart (vertical) */
interface BarData {
  label: string;
  v: number;
  value?: string;
  color?: string;
}
interface BarChartProps {
  w?: number;
  h?: number;
  data: BarData[];
  color?: string;
}
export function BarChart({ w = 720, h = 200, data, color = 'var(--accent)' }: BarChartProps) {
  const pad = { l: 44, r: 12, t: 12, b: 24 };
  const inner = { w: w - pad.l - pad.r, h: h - pad.t - pad.b };
  const max = Math.max(...data.map(d => d.v));
  const bw = inner.w / data.length;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', maxWidth: '100%' }}>
      {[0, 0.5, 1].map((p, i) => {
        const yy = pad.t + inner.h * (1 - p);
        return <line key={i} x1={pad.l} x2={pad.l + inner.w} y1={yy} y2={yy} stroke="var(--border)" />;
      })}
      {data.map((d, i) => {
        const bh = (d.v / max) * inner.h * 0.92;
        const xx = pad.l + i * bw + bw * 0.18;
        const yy = pad.t + inner.h - bh;
        return (
          <g key={i}>
            <rect x={xx} y={yy} width={bw * 0.64} height={bh} rx="4" fill={d.color || color} />
            <text x={xx + bw * 0.32} y={h - 8} fontSize="10" fill="var(--ink-3)" textAnchor="middle" fontFamily="var(--mono)">{d.label}</text>
            <text x={xx + bw * 0.32} y={yy - 4} fontSize="10" fill="var(--ink-2)" textAnchor="middle" fontFamily="var(--mono)" fontWeight="800">{d.value || d.v}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* Donut chart */
interface DonutSegment {
  label: string;
  value: number;
  color: string;
}
interface DonutProps {
  size?: number;
  thickness?: number;
  segments: DonutSegment[];
}
export function Donut({ size = 120, thickness = 16, segments }: DonutProps) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const r = (size - thickness) / 2;
  const c = size / 2;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={thickness} />
      {segments.map((s, i) => {
        const frac = s.value / total;
        const start = acc;
        acc += frac;
        const dash = 2 * Math.PI * r;
        return (
          <circle key={i} cx={c} cy={c} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
            strokeDasharray={`${dash * frac} ${dash}`}
            strokeDashoffset={-dash * start}
            transform={`rotate(-90 ${c} ${c})`}
            strokeLinecap="butt"
          />
        );
      })}
    </svg>
  );
}
