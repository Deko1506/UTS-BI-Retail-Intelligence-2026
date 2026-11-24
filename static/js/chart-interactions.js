(() => {
  if (!window.Chart) return;

  const numberFormat = new Intl.NumberFormat("id-ID", {maximumFractionDigits: 2});
  const percentFormat = new Intl.NumberFormat("id-ID", {style: "percent", maximumFractionDigits: 1});
  const moneyFormat = value => window.formatMoney ? window.formatMoney(value) : `Rp ${numberFormat.format(value)}`;
  const numeric = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value))
    ? Number(value) : null;

  Chart.defaults.interaction = {mode: "nearest", intersect: false, axis: "xy"};
  Chart.defaults.plugins.tooltip.enabled = true;
  Chart.defaults.plugins.tooltip.mode = "nearest";
  Chart.defaults.plugins.tooltip.intersect = false;

  Chart.register({
    id: "retailInsight",
    afterInit(chart) {
      const canvas = chart.canvas;
      const wrap = canvas.parentElement;
      if (!wrap) return;

      const insight = document.createElement("section");
      insight.className = "chart-insight";
      insight.setAttribute("role", "status");
      insight.setAttribute("aria-live", "polite");
      insight.innerHTML = '<b class="chart-insight-title">Presentasi data</b><span class="chart-insight-copy">Arahkan atau geser kursor di atas grafik untuk melihat detail titik.</span>';
      wrap.insertAdjacentElement("afterend", insight);
      canvas.setAttribute("tabindex", "0");

      chart.$retailInsight = {
        title: insight.querySelector(".chart-insight-title"),
        copy: insight.querySelector(".chart-insight-copy")
      };

      canvas.addEventListener("keydown", event => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        const points = chart.data.datasets.flatMap((dataset, datasetIndex) =>
          dataset.data.map((_, index) => ({datasetIndex, index})));
        if (!points.length) return;
        event.preventDefault();
        const current = chart.$retailInsight.activeIndex ?? -1;
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const next = points[(current + direction + points.length) % points.length];
        chart.$retailInsight.activeIndex = points.indexOf(next);
        const boxplots = chart.options.plugins.retailInsight?.boxplots;
        if (boxplots) showBoxplot(chart, boxplots[next.index]);
        else showPoint(chart, next);
      });
    },
    afterDatasetsDraw(chart) {
      const rows = chart.options.plugins.retailInsight?.boxplots;
      if (!rows?.length) return;
      const x = chart.scales.x;
      const y = chart.scales.y;
      if (!x || !y) return;

      const context = chart.ctx;
      context.save();
      rows.forEach((row, index) => {
        const center = y.getPixelForValue(row.label, index);
        const left = x.getPixelForValue(row.q1);
        const right = x.getPixelForValue(row.q3);
        const color = ["#3b82f6", "#06b6d4", "#14b8a6", "#7c3aed", "#f59e0b"][index % 5];
        context.strokeStyle = color;
        context.fillStyle = `${color}66`;
        context.lineWidth = 1.5;
        context.beginPath();
        context.moveTo(x.getPixelForValue(row.min), center);
        context.lineTo(x.getPixelForValue(row.max), center);
        context.moveTo(x.getPixelForValue(row.min), center - 5);
        context.lineTo(x.getPixelForValue(row.min), center + 5);
        context.moveTo(x.getPixelForValue(row.max), center - 5);
        context.lineTo(x.getPixelForValue(row.max), center + 5);
        context.stroke();
        context.fillRect(left, center - 8, Math.max(1, right - left), 16);
        context.strokeRect(left, center - 8, Math.max(1, right - left), 16);
        context.strokeStyle = "#e2e8f0";
        context.beginPath();
        context.moveTo(x.getPixelForValue(row.median), center - 8);
        context.lineTo(x.getPixelForValue(row.median), center + 8);
        context.stroke();
        context.fillStyle = "#fca5a5";
        row.outliers.forEach(value => {
          context.beginPath();
          context.arc(x.getPixelForValue(value), center, 2.5, 0, Math.PI * 2);
          context.fill();
        });
      });
      context.restore();
    },
    afterEvent(chart, args) {
      const eventType = args.event.type;
      if (!["mousemove", "touchmove", "touchstart", "click"].includes(eventType)) return;
      const boxplots = chart.options.plugins.retailInsight?.boxplots;
      if (boxplots?.length) {
        const x = chart.scales.x;
        const y = chart.scales.y;
        let closestOutlier = null;
        boxplots.forEach((row, index) => {
          const center = y.getPixelForValue(row.label, index);
          row.outliers.forEach(value => {
            const dx = x.getPixelForValue(value) - args.event.x;
            const dy = center - args.event.y;
            const distance = Math.hypot(dx, dy);
            if (distance <= 12 && (!closestOutlier || distance < closestOutlier.distance)) {
              closestOutlier = {row, value, distance};
            }
          });
        });
        if (closestOutlier) showBoxplot(chart, closestOutlier.row, closestOutlier.value);
        else {
          const row = boxplots.reduce((nearest, item, index) => {
            const distance = Math.abs(y.getPixelForValue(item.label, index) - args.event.y);
            return !nearest || distance < nearest.distance ? {item, distance} : nearest;
          }, null);
          if (row) showBoxplot(chart, row.item);
        }
        return;
      }
      const [point] = chart.getElementsAtEventForMode(
        args.event, "nearest", {intersect: false, axis: "xy"}, false
      );
      if (point) showPoint(chart, point);
    }
  });

  function showPoint(chart, point) {
    const insight = chart.$retailInsight;
    if (!insight) return;
    const dataset = chart.data.datasets[point.datasetIndex];
    const raw = dataset.data[point.index];
    const label = chart.data.labels?.[point.index] ?? `Titik ${point.index + 1}`;
    const datasetName = dataset.label || "Nilai";
    let valueText;
    let detail;
    let value = numeric(raw);

    if (raw && typeof raw === "object") {
      const fields = Object.entries(raw)
        .filter(([key, item]) => key !== "label" && item !== null && item !== undefined)
        .map(([key, item]) => `${key}: ${numberFormat.format(item)}`);
      const pointLabel = raw.label ? `${raw.label} · ` : "";
      valueText = fields.join(" · ");
      detail = `${pointLabel}${valueText}.`;
    } else {
      const moneyValue = /rp|sales|monetary|penjualan|revenue/i.test(datasetName);
      const percentValue = /support|confidence|silhouette/i.test(datasetName) && value !== null && Math.abs(value) <= 1;
      valueText = value === null ? String(raw ?? "—")
        : moneyValue ? moneyFormat(value)
        : percentValue ? percentFormat.format(value)
        : numberFormat.format(value);

      if (chart.config.type === "pie" || chart.config.type === "doughnut") {
        const values = dataset.data.map(numeric).filter(item => item !== null);
        const total = values.reduce((sum, item) => sum + item, 0);
        const share = total ? percentFormat.format((value || 0) / total) : "0%";
        detail = `${label} mewakili ${share} dari total ${numberFormat.format(total)}.`;
      } else if (chart.config.type === "line" && value !== null && point.index > 0) {
        const previous = numeric(dataset.data[point.index - 1]);
        const direction = previous === null || value === previous ? "tetap" : value > previous ? "naik" : "turun";
        detail = `${datasetName} ${direction} dari ${numberFormat.format(previous ?? 0)} menjadi ${valueText}.`;
      } else if (chart.config.type === "bar" && value !== null) {
        const values = dataset.data.map(numeric).filter(item => item !== null);
        const rank = values.filter(item => item > value).length + 1;
        detail = `${label}: ${valueText}; peringkat ${rank} dari ${values.length} nilai pada seri ini.`;
      } else {
        detail = `${datasetName} pada ${label}: ${valueText}.`;
      }
    }

    insight.title.textContent = `${label} · ${datasetName}`;
    insight.copy.textContent = detail;
  }

  function showBoxplot(chart, row, outlier) {
    const insight = chart.$retailInsight;
    if (!insight || !row) return;
    insight.title.textContent = outlier === undefined
      ? `${row.label} · Ringkasan boxplot`
      : `${row.label} · Titik pencilan`;
    insight.copy.textContent = outlier === undefined
      ? `Min ${numberFormat.format(row.min)} · Q1 ${numberFormat.format(row.q1)} · Median ${numberFormat.format(row.median)} · Q3 ${numberFormat.format(row.q3)} · Maks ${numberFormat.format(row.max)} · Pencilan ${numberFormat.format(row.outlier_count)}`
      : `Nilai pencilan ${numberFormat.format(outlier)}; batas whisker ${numberFormat.format(row.min)}–${numberFormat.format(row.max)}.`;
  }
})();
