"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardTitle, PALETTE } from "./ui";

const AXIS = { fontSize: 11, fill: "#888" } as const;

export function BarCard({
  title,
  data,
  xKey,
  bars,
  height = 280,
}: {
  title: string;
  data: Record<string, unknown>[];
  xKey: string;
  bars: { key: string; name: string; color?: string }[];
  height?: number;
}) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#8881" />
          <XAxis dataKey={xKey} tick={AXIS} interval={0} angle={-25} textAnchor="end" height={70} />
          <YAxis tick={AXIS} allowDecimals={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            labelStyle={{ fontWeight: 600 }}
          />
          {bars.length > 1 ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}
          {bars.map((b, i) => (
            <Bar
              key={b.key}
              dataKey={b.key}
              name={b.name}
              fill={b.color ?? PALETTE[i % PALETTE.length]}
              radius={[3, 3, 0, 0]}
              stackId={bars.length > 1 ? "a" : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function LineCard({
  title,
  data,
  xKey,
  lines,
  height = 280,
}: {
  title: string;
  data: Record<string, unknown>[];
  xKey: string;
  lines: { key: string; name: string; color?: string }[];
  height?: number;
}) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#8881" />
          <XAxis dataKey={xKey} tick={AXIS} />
          <YAxis tick={AXIS} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {lines.map((l, i) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.name}
              stroke={l.color ?? PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function DonutCard({
  title,
  data,
  height = 280,
  colors,
}: {
  title: string;
  data: { name: string; value: number; color?: string }[];
  height?: number;
  colors?: string[];
}) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
          >
            {data.map((d, i) => (
              <Cell
                key={d.name}
                fill={d.color ?? (colors ?? PALETTE)[i % (colors ?? PALETTE).length]}
              />
            ))}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
