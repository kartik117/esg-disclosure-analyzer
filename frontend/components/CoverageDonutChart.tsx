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

const COLORS = ["#2563eb", "#cbd5e1"];

export default function CoverageDonutChart({ data }: Props) {
  return (
    <div style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={3}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
             <Label
                value="ESG Coverage"
                position="center"
                style={{ fontSize: 14, fontWeight: 600 }}
            />
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
