import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
  type Chart,
} from 'chart.js';

type BarPoint = { x?: number; y?: number; base?: number };

export interface StackedBarValueLabelsOptions {
  labels: string[];
  selectedIndex: number;
  hoveredIndex: number | null;
  navy: string;
  text: string;
}

declare module 'chart.js' {
  interface PluginOptionsByType<TType> {
    stackedBarValueLabels?: StackedBarValueLabelsOptions;
  }
}

export const stackedBarValueLabelsPlugin = {
  id: 'stackedBarValueLabels',
  afterDatasetsDraw(chart: Chart<'bar'>) {
    const opts = chart.options.plugins?.stackedBarValueLabels;
    if (!opts?.labels?.length || opts.navy == null || opts.text == null) return;
    const { labels, selectedIndex, hoveredIndex, navy, text } = opts;
    const isHighlighted = (i: number) => i === selectedIndex || i === hoveredIndex;

    const trackMeta = chart.getDatasetMeta(0);
    if (!trackMeta?.data?.length) return;

    const { ctx } = chart;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = '600 11px "DM Sans", system-ui, sans-serif';

    labels.forEach((label, i) => {
      const bar = trackMeta.data[i] as BarPoint;
      if (!bar || !label) return;
      const x = bar.x;
      const y = bar.y;
      if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)) return;
      ctx.fillStyle = isHighlighted(i) ? navy : text;
      ctx.fillText(label, x, y - 8);
    });

    ctx.restore();
  },
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
  stackedBarValueLabelsPlugin
);

export { ChartJS };
