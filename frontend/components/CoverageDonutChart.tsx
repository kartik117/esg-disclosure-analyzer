"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { Label } from "recharts";

type Item = {
  name: string;
  value: number;
};

type Props = {
  data: Item[];
};

const COLORS = ["#38bdf8", "#334155"];

export default function CoverageDonutChart({ data }: Props) {
  return (
    <div style={{ height: 172 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={42}
            outerRadius={68}
            paddingAngle={3}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
             <Label
                value="ESG Coverage"
                position="center"
                style={{ fontSize: 12, fontWeight: 600, fill: "#cbd5e1" }}
            />
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#111827",
              borderColor: "#334155",
              borderRadius: 14,
              color: "#e2e8f0",
            }}
          />
          <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: "12px" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
