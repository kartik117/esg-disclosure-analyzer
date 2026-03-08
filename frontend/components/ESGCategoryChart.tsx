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
    <div style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip />
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