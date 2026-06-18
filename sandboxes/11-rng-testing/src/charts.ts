import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  ScatterController,
  Tooltip,
} from "chart.js";
import type { RandomnessStats } from "./stats";

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  ScatterController,
  Tooltip,
  Legend,
);

Chart.defaults.color = "#5f6368";
Chart.defaults.borderColor = "#dadce0";
Chart.defaults.font.family =
  '"Google Sans", Roboto, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

let histogramChart: Chart | null = null;
let scatterChart: Chart | null = null;

function binLabel(index: number, bins: number): string {
  const lo = (index / bins).toFixed(2);
  const hi = ((index + 1) / bins).toFixed(2);
  return `${lo}–${hi}`;
}

export function updateHistogramChart(canvas: HTMLCanvasElement, stats: RandomnessStats): void {
  const { histogram } = stats;
  const labels = Array.from({ length: histogram.bins }, (_, i) => binLabel(i, histogram.bins));
  const counts = Array.from(histogram.counts);
  const expected = Array.from({ length: histogram.bins }, () => histogram.expected);

  if (!histogramChart) {
    histogramChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            type: "bar",
            label: "Observed",
            data: counts,
            backgroundColor: "#1a73e8",
            borderRadius: 2,
          },
          {
            type: "line",
            label: "Expected",
            data: expected,
            borderColor: "#c5221f",
            borderDash: [4, 4],
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" },
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            title: { display: true, text: "Count" },
          },
        },
      },
    });
    return;
  }

  histogramChart.data.labels = labels;
  const [observed, expectedLine] = histogramChart.data.datasets;
  if (observed) observed.data = counts;
  if (expectedLine) expectedLine.data = expected;
  histogramChart.update();
}

export function updateScatterChart(canvas: HTMLCanvasElement, values: Float64Array): void {
  const step = Math.max(1, Math.floor((values.length - 1) / 4000));
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < values.length - 1; i += step) {
    points.push({ x: values[i] ?? 0, y: values[i + 1] ?? 0 });
  }

  if (!scatterChart) {
    scatterChart = new Chart(canvas, {
      type: "scatter",
      data: {
        datasets: [
          {
            label: "Consecutive pairs",
            data: points,
            backgroundColor: "rgba(26, 115, 232, 0.35)",
            pointRadius: 2,
            pointHoverRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            min: 0,
            max: 1,
            title: { display: true, text: "xᵢ" },
          },
          y: {
            min: 0,
            max: 1,
            title: { display: true, text: "xᵢ₊₁" },
          },
        },
      },
    });
    return;
  }

  const dataset = scatterChart.data.datasets[0];
  if (dataset) dataset.data = points;
  scatterChart.update();
}
