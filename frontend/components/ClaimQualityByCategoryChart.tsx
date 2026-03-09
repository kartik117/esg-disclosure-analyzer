"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type ChartItem = {
  category: string;
  Measurable?: number;
  Neutral?: number;
  Vague?: number;
};

type Props = {
  data: ChartItem[];
};

export default function ClaimQualityByCategoryChart({ data }: Props) {
  return (
    <div style={{ height: 194 }}>
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
          <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: "12px" }} />
          <Bar dataKey="Measurable" stackId="a" fill="#38bdf8" />
          <Bar dataKey="Neutral" stackId="a" fill="#64748b" />
          <Bar dataKey="Vague" stackId="a" fill="#fb7185" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
