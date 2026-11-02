/**
 * Chart components (Recharts). Imported lazily through LazyCharts.tsx so the
 * chart library is not part of the initial bundle.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const axis = { stroke: 'var(--muted)', fontSize: 12 };
const tooltipStyle = {
  contentStyle: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    color: 'var(--fg)',
    fontSize: 13,
  },
  labelStyle: { color: 'var(--muted)' },
};

export interface RadarDatum {
  area: string;
  value: number;
  previous?: number;
}

export function DiagnosisRadar({ data, labels }: { data: RadarDatum[]; labels: { current: string; previous?: string } }) {
  const hasPrev = data.some((d) => d.previous !== undefined);
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="area" tick={{ fill: 'var(--fg)', fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} />
        {hasPrev && (
          <Radar
            name={labels.previous}
            dataKey="previous"
            stroke="var(--chart-3)"
            fill="var(--chart-3)"
            fillOpacity={0.12}
            strokeDasharray="4 3"
          />
        )}
        <Radar name={labels.current} dataKey="value" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.35} strokeWidth={2} />
        <Tooltip {...tooltipStyle} />
        {hasPrev && <Legend wrapperStyle={{ fontSize: 12 }} />}
      </RadarChart>
    </ResponsiveContainer>
  );
}

export interface SeriesPoint {
  label: string;
  [series: string]: number | string | undefined;
}

export function TrendChart({
  data,
  series,
  max,
  threshold,
  height = 240,
}: {
  data: SeriesPoint[];
  series: { key: string; name: string; color?: string; dashed?: boolean }[];
  max?: number;
  threshold?: { value: number; label: string };
  height?: number;
}) {
  const colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
        <YAxis domain={[0, max ?? 'auto']} tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...tooltipStyle} />
        {threshold && (
          <ReferenceLine
            y={threshold.value}
            stroke="var(--chart-2)"
            strokeDasharray="5 4"
            label={{ value: threshold.label, fill: 'var(--muted)', fontSize: 11, position: 'insideTopRight' }}
          />
        )}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color ?? colors[i % colors.length]}
            strokeWidth={2.5}
            strokeDasharray={s.dashed ? '5 4' : undefined}
            dot={{ r: 3.5 }}
            activeDot={{ r: 6 }}
            connectNulls
          />
        ))}
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PrePostChart({
  data,
  labels,
  max = 5,
}: {
  data: { label: string; pre?: number; post?: number }[];
  labels: { pre: string; post: string };
  max?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 56)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" domain={[0, max]} tick={axis} />
        <YAxis type="category" dataKey="label" width={150} tick={{ fill: 'var(--fg)', fontSize: 11 }} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="pre" name={labels.pre} fill="var(--chart-3)" radius={[0, 6, 6, 0]} />
        <Bar dataKey="post" name={labels.post} fill="var(--chart-1)" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
