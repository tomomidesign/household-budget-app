"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { ReactNode } from "react";
import { categoryExpenseData, monthlyTrend, paymentMethodData } from "@/lib/analytics";
import { monthKey } from "@/lib/date";
import type { AppState } from "@/types/budget";

const colors = ["#1a73e8", "#188038", "#f9ab00", "#d93025", "#9334e6", "#12b5cb"];

type AnalyticsViewProps = {
  state: AppState;
};

export function AnalyticsView({ state }: AnalyticsViewProps) {
  const currentMonth = monthKey();
  const trend = monthlyTrend(state.entries);
  const categoryData = categoryExpenseData(state, currentMonth);
  const paymentData = paymentMethodData(state, currentMonth);

  return (
    <section className="space-y-4">
      <ChartPanel title="月別収支">
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Bar dataKey="income" name="収入" fill="#188038" />
            <Bar dataKey="expense" name="支出" fill="#d93025" />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="カテゴリ別支出">
        <ResponsiveContainer width="100%" height={230}>
          <PieChart>
            <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={80} label>
              {categoryData.map((_, index) => (
                <Cell key={index} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="年間推移">
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Line type="monotone" dataKey="income" name="収入" stroke="#188038" strokeWidth={3} />
            <Line type="monotone" dataKey="expense" name="支出" stroke="#d93025" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="支払方法別集計">
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={paymentData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" fontSize={12} />
            <YAxis dataKey="name" type="category" fontSize={12} width={86} />
            <Tooltip />
            <Bar dataKey="value" name="金額" fill="#1a73e8" />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>
    </section>
  );
}

function ChartPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg bg-white p-4 shadow-material">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}
