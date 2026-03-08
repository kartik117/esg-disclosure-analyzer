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
    <div style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Measurable" stackId="a" fill="#2563eb" />
          <Bar dataKey="Neutral" stackId="a" fill="#94a3b8" />
          <Bar dataKey="Vague" stackId="a" fill="#f97316" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
