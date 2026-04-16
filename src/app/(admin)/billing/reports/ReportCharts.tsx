"use client";

import type { CSSProperties } from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { FD } from "@/constants/financeDesign";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
);

const chartBox: CSSProperties = {
  position: "relative",
  height: 200,
  maxHeight: 200,
};

export function MonthlyRevenueExpenseBar({
  labels,
  revenue,
  expenses,
  fontSans,
  fontMono,
}: {
  labels: string[];
  revenue: number[];
  expenses: number[];
  fontSans: string;
  fontMono: string;
}) {
  return (
    <div style={chartBox}>
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: "Revenue",
              data: revenue,
              backgroundColor: "rgba(29,158,117,0.15)",
              borderColor: "#1D9E75",
              borderWidth: 1.5,
              borderRadius: 4,
            },
            {
              label: "Expenses",
              data: expenses,
              backgroundColor: "rgba(162,45,45,0.1)",
              borderColor: "#A32D2D",
              borderWidth: 1.5,
              borderRadius: 4,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                font: { family: fontSans, size: 11 },
                color: FD.k5,
                boxWidth: 10,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { family: fontMono, size: 10 }, color: FD.k5 },
            },
            y: {
              grid: { color: "rgba(0,0,0,0.04)" },
              ticks: {
                font: { family: fontMono, size: 10 },
                color: FD.k5,
                callback: (v) => `KES ${Math.round(Number(v) / 1000)}k`,
              },
            },
          },
        }}
      />
    </div>
  );
}

export function OccupancyTrendLine({
  labels,
  occupancyPct,
  fontSans,
  fontMono,
}: {
  labels: string[];
  occupancyPct: number[] | null;
  fontSans: string;
  fontMono: string;
}) {
  if (!occupancyPct || occupancyPct.length === 0) {
    return (
      <div
        style={{
          ...chartBox,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 16px",
          fontSize: 13,
          color: FD.k5,
          fontFamily: fontSans,
          border: `0.5px dashed ${FD.bd}`,
          borderRadius: FD.rmd,
        }}
      >
        Occupancy is not included in financial reports yet. This chart will fill in when the API
        provides a time series.
      </div>
    );
  }

  return (
    <div style={chartBox}>
      <Line
        data={{
          labels,
          datasets: [
            {
              label: "Occupancy %",
              data: occupancyPct,
              borderColor: "#1D9E75",
              backgroundColor: "rgba(29,158,117,0.08)",
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: "#1D9E75",
              pointRadius: 3,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { family: fontMono, size: 10 }, color: FD.k5 },
            },
            y: {
              min: 60,
              max: 100,
              grid: { color: "rgba(0,0,0,0.04)" },
              ticks: {
                font: { family: fontMono, size: 10 },
                color: FD.k5,
                callback: (v) => `${v}%`,
              },
            },
          },
        }}
      />
    </div>
  );
}
