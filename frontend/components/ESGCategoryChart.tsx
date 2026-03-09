"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type ESGCategoryItem = {
  category: string;
  count: number;
};

type ESGCategoryChartProps = {
  data: ESGCategoryItem[];
  onBarClick?: (category: string) => void;
};

export default function ESGCategoryChart({
  data,
  onBarClick,
}: ESGCategoryChartProps) {
  return (
    <div style={{ height: 184 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 6, left: -20, bottom: -2 }}>
          <XAxis dataKey="category" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111827",
              borderColor: "#334155",
              borderRadius: 14,
              color: "#e2e8f0",
            }}
          />
          <Bar dataKey="count" fill="#2563eb">
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                cursor={onBarClick ? "pointer" : "default"}
                onClick={() => onBarClick?.(entry.category)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
