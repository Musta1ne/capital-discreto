import { useId } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PeriodResult } from "../lib/savings";
import { formatCompact, formatMoney } from "../lib/format";

export function SavingsChart({
  data,
  showReal = false,
  baseDate,
}: {
  data: PeriodResult[];
  showReal?: boolean;
  baseDate?: string;
}) {
  const gradientId = useId().replaceAll(":", "");
  return (
    <div
      className="chart-container"
      role="img"
      aria-label={
        showReal
          ? `Evolución del saldo nominal, aportes nominales y saldo real en pesos del ${baseDate}. Valores exactos en la tabla.`
          : "Evolución del saldo y los aportes sin intereses. Los valores exactos están en la tabla por período."
      }
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 12, left: 4, bottom: 10 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b6ed80" stopOpacity={0.19} />
              <stop offset="100%" stopColor="#b6ed80" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="#28302f"
            strokeDasharray="3 5"
            vertical={false}
          />
          <XAxis
            dataKey="period"
            type="number"
            domain={[0, data.length - 1]}
            allowDecimals={false}
            minTickGap={28}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#89958e", fontSize: 12 }}
            label={{
              value: "Períodos de 30 días",
              fill: "#89958e",
              fontSize: 12,
              position: "insideBottom",
              offset: -10,
            }}
          />
          <YAxis
            tickFormatter={formatCompact}
            width={90}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#89958e", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              background: "#1b2420",
              border: "1px solid #3d4b40",
              borderRadius: 12,
              color: "#edf3ea",
              fontSize: 13,
            }}
            labelFormatter={(label) =>
              `Período ${label} · ${Number(label) * 30} días`
            }
            formatter={(value, name) => [formatMoney(Number(value)), name]}
          />
          <Area
            name={showReal ? "Saldo nominal" : "Saldo con intereses"}
            dataKey="balance"
            type="linear"
            stroke="#b6ed80"
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            activeDot={{ r: 5, stroke: "#0b1012", strokeWidth: 3 }}
          />
          <Line
            name={showReal ? "Aportes nominales" : "Aportes sin intereses"}
            dataKey="contributed"
            type="linear"
            stroke="#9b9bb9"
            strokeWidth={1.8}
            strokeDasharray="5 5"
            dot={false}
            isAnimationActive={false}
          />
          {showReal && (
            <Line
              name={`Saldo real (pesos del ${baseDate})`}
              dataKey="realBalance"
              type="linear"
              stroke="#89c9dd"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
