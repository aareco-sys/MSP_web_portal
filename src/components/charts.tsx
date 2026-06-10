"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, PALETTE } from "./ui";

const GRID = "rgba(11,18,32,0.06)";
const TICK = { fontSize: 11, fill: "#9aa0ad" } as const;

const TOOLTIP = {
  contentStyle: {
    background: "#093921",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "8px 12px",
    boxShadow: "0 16px 32px rgba(11,18,32,.18)",
  },
  labelStyle: { color: "#ffffff", fontWeight: 600, fontSize: 12, marginBottom: 2 },
  itemStyle: { color: "#d8f0e1", fontSize: 12 },
} as const;

const LEGEND = { fontSize: 12, color: "#565d6d" } as const;

interface Series {
  key: string;
  name: string;
  color?: string;
}

export function BarCard({
  title,
  sub,
  data,
  xKey,
  bars,
  height = 280,
  horizontal = false,
  stacked = false,
}: {
  title: string;
  sub?: string;
  data: Record<string, unknown>[];
  xKey: string;
  bars: Series[];
  height?: number;
  horizontal?: boolean;
  stacked?: boolean;
}) {
  const showLegend = bars.length > 1;
  return (
    <Card title={title} sub={sub}>
      <div className="chart-wrap" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout={horizontal ? "vertical" : "horizontal"}
            margin={{ top: 4, right: 12, bottom: 4, left: horizontal ? 8 : -12 }}
            barCategoryGap={horizontal ? "22%" : "26%"}
          >
            <CartesianGrid
              stroke={GRID}
              horizontal={!horizontal}
              vertical={horizontal}
            />
            {horizontal ? (
              <>
                <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey={xKey}
                  tick={TICK}
                  axisLine={false}
                  tickLine={false}
                  width={130}
                  interval={0}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey={xKey}
                  tick={TICK}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-28}
                  textAnchor="end"
                  height={70}
                />
                <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
              </>
            )}
            <Tooltip cursor={{ fill: "rgba(61,170,110,0.07)" }} {...TOOLTIP} />
            {showLegend ? (
              <Legend wrapperStyle={LEGEND} iconType="circle" iconSize={8} />
            ) : null}
            {bars.map((b, i) => (
              <Bar
                key={b.key}
                dataKey={b.key}
                name={b.name}
                fill={b.color ?? PALETTE[i % PALETTE.length]}
                radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                maxBarSize={horizontal ? 22 : 46}
                stackId={stacked ? "a" : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function LineCard({
  title,
  sub,
  data,
  xKey,
  lines,
  height = 280,
  area = false,
}: {
  title: string;
  sub?: string;
  data: Record<string, unknown>[];
  xKey: string;
  lines: Series[];
  height?: number;
  area?: boolean;
}) {
  return (
    <Card title={title} sub={sub}>
      <div className="chart-wrap" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {area ? (
            <AreaChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: -12 }}>
              <defs>
                {lines.map((l, i) => {
                  const c = l.color ?? PALETTE[i % PALETTE.length];
                  return (
                    <linearGradient key={l.key} id={`g-${l.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={c} stopOpacity={0.02} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey={xKey} tick={TICK} axisLine={false} tickLine={false} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP} />
              {lines.length > 1 ? <Legend wrapperStyle={LEGEND} iconType="circle" iconSize={8} /> : null}
              {lines.map((l, i) => {
                const c = l.color ?? PALETTE[i % PALETTE.length];
                return (
                  <Area
                    key={l.key}
                    type="monotone"
                    dataKey={l.key}
                    name={l.name}
                    stroke={c}
                    strokeWidth={2.5}
                    fill={`url(#g-${l.key})`}
                    dot={false}
                    connectNulls
                  />
                );
              })}
            </AreaChart>
          ) : (
            <LineChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: -12 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey={xKey} tick={TICK} axisLine={false} tickLine={false} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP} />
              {lines.length > 1 ? <Legend wrapperStyle={LEGEND} iconType="circle" iconSize={8} /> : null}
              {lines.map((l, i) => (
                <Line
                  key={l.key}
                  type="monotone"
                  dataKey={l.key}
                  name={l.name}
                  stroke={l.color ?? PALETTE[i % PALETTE.length]}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function RadarCard({
  title,
  sub,
  data,
  engName,
  teamName,
  height = 300,
}: {
  title: string;
  sub?: string;
  data: { axis: string; eng: number; team: number }[];
  engName: string;
  teamName: string;
  height?: number;
}) {
  return (
    <Card title={title} sub={sub}>
      <div className="chart-wrap" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="#e5e8ed" />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "#565d6d" }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar name={teamName} dataKey="team" stroke="#9aa0ad" fill="#9aa0ad" fillOpacity={0.18} />
            <Radar name={engName} dataKey="eng" stroke="#3daa6e" fill="#3daa6e" fillOpacity={0.35} />
            <Legend wrapperStyle={LEGEND} iconType="circle" iconSize={8} />
            <Tooltip {...TOOLTIP} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function DonutCard({
  title,
  data,
  height = 280,
  centerTop,
  centerBottom,
}: {
  title: string;
  data: { name: string; value: number; color?: string }[];
  height?: number;
  centerTop?: string;
  centerBottom?: string;
}) {
  return (
    <Card title={title}>
      <div className="chart-wrap" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="64%"
              outerRadius="86%"
              paddingAngle={2}
              stroke="#ffffff"
              strokeWidth={2}
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={d.color ?? PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip {...TOOLTIP} />
            <Legend wrapperStyle={LEGEND} iconType="circle" iconSize={8} />
          </PieChart>
        </ResponsiveContainer>
        {centerTop ? (
          <div className="donut-center" style={{ bottom: 38 }}>
            <div>
              <b>{centerTop}</b>
              {centerBottom ? <span>{centerBottom}</span> : null}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
