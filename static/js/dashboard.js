(() => {
  const result = window.initialResults;
  const chartColors = ["#3b82f6","#06b6d4","#14b8a6","#7c3aed","#f59e0b","#60a5fa","#2dd4bf","#a78bfa","#fb7185","#94a3b8"];
  Chart.defaults.color = "#8fa1b9";
  Chart.defaults.borderColor = "rgba(100,125,158,.17)";
  Chart.defaults.font.family = "Inter, sans-serif";
  Chart.defaults.font.size = 10;
  const make = (id, config) => { const el=document.getElementById(id); if(el && result) { const c=new Chart(el,config); return c; } return null; };
  if (result) {
    if (result.monthly_sales?.length) {
      document.getElementById("monthlyEmpty")?.setAttribute("hidden","");
      make("monthlyChart",{type:"line",data:{labels:result.monthly_sales.map(x=>x.month),datasets:[{label:"Penjualan",data:result.monthly_sales.map(x=>x.sales),borderColor:"#38bdf8",backgroundColor:"rgba(56,189,248,.10)",fill:true,tension:.32,pointRadius:3,pointBackgroundColor:"#38bdf8"}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>window.formatMoney(c.raw)}}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,ticks:{callback:v=>new Intl.NumberFormat("id-ID",{notation:"compact"}).format(v)}}}}});
    }
    if (result.top_products?.length) {
      document.getElementById("productsEmpty")?.setAttribute("hidden","");
      make("productsChart",{type:"bar",data:{labels:result.top_products.map(x=>x.product),datasets:[{label:"Penjualan",data:result.top_products.map(x=>x.sales),backgroundColor:result.top_products.map((_,i)=>chartColors[i%chartColors.length]),borderRadius:5,barThickness:13}]},options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>window.formatMoney(c.raw)}}},scales:{x:{beginAtZero:true,ticks:{callback:v=>new Intl.NumberFormat("id-ID",{notation:"compact"}).format(v)}},y:{grid:{display:false}}}}});
    }
  }
  const profile = window.profileData;
  if(profile?.column_profile) {
    const miss = profile.column_profile.filter(x=>x.missing>0);
    const el=document.getElementById("missingChart");
    if(el) new Chart(el,{type:"bar",data:{labels:miss.map(x=>x.column),datasets:[{label:"Missing",data:miss.map(x=>x.missing),backgroundColor:"#f59e0b",borderRadius:4}]},options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true},y:{grid:{display:false}}}}});
    const counts={}; profile.column_profile.forEach(x=>counts[x.dtype]=(counts[x.dtype]||0)+1);
    const d=document.getElementById("dtypeChart");
    if(d) new Chart(d,{type:"doughnut",data:{labels:Object.keys(counts),datasets:[{data:Object.values(counts),backgroundColor:chartColors,borderColor:"#131f33",borderWidth:3}]},options:{responsive:true,maintainAspectRatio:false,cutout:"68%",plugins:{legend:{position:"bottom",labels:{usePointStyle:true,boxWidth:7,padding:14}}}}});
  }

  // ===== Module-specific charts (segmentation, recommendations) =====
  const mod = window.moduleData;
  const fmtId = n => new Intl.NumberFormat("id-ID").format(n);
  const percentFormat = n => new Intl.NumberFormat("id-ID", {style: "percent", maximumFractionDigits: 2}).format(n);
  if (mod) {
    const renderBoxplot = (id, rows) => {
      const el = document.getElementById(id);
      if (!el || !rows?.length) return;
      new Chart(el, {
        type: "bar",
        data: {
          labels: rows.map(row => row.label),
          datasets: [{
            label: "Rentang nilai",
            data: rows.map(row => [row.min, row.max]),
            backgroundColor: "rgba(0,0,0,0)",
            borderColor: "rgba(0,0,0,0)",
            borderWidth: 0,
            barThickness: 1
          }]
        },
        options: {
          indexAxis: "y", responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: {display: false},
            retailInsight: {boxplots: rows},
            tooltip: {callbacks: {label: c => `Median ${fmtId(rows[c.dataIndex].median)}`}}
          },
          scales: {
            x: {type: "linear", grid: {color: "rgba(100,125,158,.15)"}, ticks: {color: "#8fa1b9", callback: fmtId}},
            y: {grid: {display: false}, ticks: {color: "#8fa1b9", font: {size: 9}}}
          }
        }
      });
    };

    if (mod.page === "preprocessing" || mod.page === "validation") {
      if (mod.page === "preprocessing" && mod.rows_flow?.length) {
        new Chart(document.getElementById("rowsFlowChart"), {
          type: "line",
          data: {
            labels: mod.rows_flow.map(row => row.step),
            datasets: [
              {label: "Baris sebelum", data: mod.rows_flow.map(row => row.before), borderColor: "#3b82f6", backgroundColor: "#3b82f622", tension: .25},
              {label: "Baris sesudah", data: mod.rows_flow.map(row => row.after), borderColor: "#14b8a6", backgroundColor: "#14b8a622", tension: .25}
            ]
          },
          options: {responsive: true, maintainAspectRatio: false, plugins: {legend: {labels: {color: "#c2cfdf"}}},
            scales: {x: {grid: {display: false}}, y: {beginAtZero: true, ticks: {callback: fmtId}}}}
        });
      }
      if (mod.page === "preprocessing") renderBoxplot("numericBoxplotChart", mod.numeric_boxplots);
      if (mod.page === "validation" && mod.missing_compare?.length) {
        new Chart(document.getElementById("missingCompareChart"), {
          type: "bar",
          data: {
            labels: mod.missing_compare.map(row => row.column),
            datasets: [
              {label: "Sebelum", data: mod.missing_compare.map(row => row.before), backgroundColor: "#f59e0b"},
              {label: "Sesudah", data: mod.missing_compare.map(row => row.after), backgroundColor: "#14b8a6"}
            ]
          },
          options: {responsive: true, maintainAspectRatio: false, plugins: {legend: {labels: {color: "#c2cfdf"}}},
            scales: {x: {grid: {display: false}}, y: {beginAtZero: true, ticks: {callback: fmtId}}}}
        });
      }
      if (mod.page === "validation" && mod.audit_severity?.length) {
        new Chart(document.getElementById("auditSeverityChart"), {
          type: "bar",
          data: {
            labels: mod.audit_severity.map(row => row.severity),
            datasets: [{label: "Jumlah temuan", data: mod.audit_severity.map(row => row.count),
              backgroundColor: ["#ef4444", "#f59e0b", "#3b82f6", "#64748b"]}]
          },
          options: {indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: {legend: {display: false}},
            scales: {x: {beginAtZero: true, ticks: {callback: fmtId}}, y: {grid: {display: false}}}}
        });
      }
      if (mod.page === "validation") {
        renderBoxplot("rawBoxplotChart", mod.raw_boxplots);
        renderBoxplot("cleanBoxplotChart", mod.numeric_boxplots);
      }
    }

    if (mod.page === "apriori") {
      if (mod.top_itemsets?.length) {
        new Chart(document.getElementById("itemsetsChart"), {
          type: "bar",
          data: {labels: mod.top_itemsets.map(row => row.items),
            datasets: [{label: "Support", data: mod.top_itemsets.map(row => row.support), backgroundColor: "#3b82f6", borderRadius: 4}]},
          options: {indexAxis: "y", responsive: true, maintainAspectRatio: false,
            plugins: {legend: {display: false}, tooltip: {callbacks: {label: c => `Support ${percentFormat(c.raw)}`}}},
            scales: {x: {beginAtZero: true, ticks: {callback: value => percentFormat(value)}}, y: {grid: {display: false}}}}
        });
      }
      if (mod.rules_scatter?.length) {
        const lifts = mod.rules_scatter.map(row => Number(row.lift) || 0);
        const minLift = Math.min(...lifts), maxLift = Math.max(...lifts);
        new Chart(document.getElementById("rulesScatterChart"), {
          type: "scatter",
          data: {datasets: [{label: "Association rule", data: mod.rules_scatter,
            pointRadius: 5, pointHoverRadius: 8,
            pointBackgroundColor: mod.rules_scatter.map(row => {
              const t = maxLift === minLift ? .5 : (row.lift - minLift) / (maxLift - minLift);
              return t > .66 ? "#22c55e" : t > .33 ? "#f59e0b" : "#3b82f6";
            })}]},
          options: {responsive: true, maintainAspectRatio: false,
            plugins: {legend: {display: false}, tooltip: {callbacks: {label: c => {
              const row = c.raw;
              return `${row.label} · support ${percentFormat(row.x)} · confidence ${percentFormat(row.y)} · lift ${Number(row.lift).toFixed(2)}`;
            }}}},
            scales: {x: {title: {display: true, text: "Support"}, ticks: {callback: value => percentFormat(value)}},
              y: {title: {display: true, text: "Confidence"}, ticks: {callback: value => percentFormat(value)}}}}
        });
      }
    }

    // --- Segmentation: cluster size + monetary mean (bar, dual axis) ---
    if (mod.page === "segmentation" && mod.kmeans?.clusters?.length) {
      const cl = mod.kmeans.chosen_k;
      if (mod.kmeans.candidate_scores?.length) {
        new Chart(document.getElementById("elbowChart"), {
          type: "bar",
          data: {labels: mod.kmeans.candidate_scores.map(row => row.k), datasets: [
            {type: "line", label: "Inertia", data: mod.kmeans.candidate_scores.map(row => row.inertia),
              borderColor: "#3b82f6", backgroundColor: "#3b82f6", tension: .2, yAxisID: "y"},
            {type: "bar", label: "Silhouette", data: mod.kmeans.candidate_scores.map(row => row.silhouette),
              backgroundColor: "#14b8a677", yAxisID: "y1"}
          ]},
          options: {responsive: true, maintainAspectRatio: false,
            plugins: {legend: {labels: {color: "#c2cfdf"}}},
            scales: {x: {title: {display: true, text: "Jumlah cluster (k)"}},
              y: {position: "left", title: {display: true, text: "Inertia"}},
              y1: {position: "right", min: -1, max: 1, title: {display: true, text: "Silhouette"}, grid: {drawOnChartArea: false}}}}
        });
      }
      document.getElementById("clusterEmpty")?.setAttribute("hidden","");
      const el = document.getElementById("clusterChart");
      if (el) new Chart(el, {
        type: "bar",
        data: {
          labels: mod.kmeans.clusters.map(c => `C${c.cluster}`),
          datasets: [
            {label: "Jumlah pelanggan", data: mod.kmeans.clusters.map(c => c.count), backgroundColor: "#3b82f6", borderRadius: 5, yAxisID: "y"},
            {label: "Monetary mean (Rp)", data: mod.kmeans.clusters.map(c => c.monetary), type: "line", borderColor: "#f59e0b", backgroundColor: "#f59e0b", tension: .3, pointRadius: 4, yAxisID: "y1"}
          ]
        },
        options: {responsive: true, maintainAspectRatio: false,
          plugins: {legend: {labels: {usePointStyle: true, boxWidth: 8, padding: 14, color: "#c2cfdf"}}, tooltip: {callbacks: {label: c => `${c.dataset.label}: ${fmtId(c.raw)}`}}},
          scales: {
            x: {grid: {display: false}, ticks: {color: "#8fa1b9"}},
            y: {position: "left", title: {display: true, text: "Pelanggan", color: "#8fa1b9"}, ticks: {color: "#8fa1b9", callback: v => fmtId(v)}, grid: {color: "rgba(100,125,158,.15)"}},
            y1: {position: "right", title: {display: true, text: "Rp", color: "#8fa1b9"}, ticks: {color: "#8fa1b9", callback: v => new Intl.NumberFormat("id-ID", {notation: "compact"}).format(v)}, grid: {drawOnChartArea: false}}
          }}
      });
    }
    // --- Segmentation: interactive scatter F vs M colored by cluster ---
    if (mod.page === "segmentation" && mod.scatter?.length) {
      const el = document.getElementById("rfmScatterChart");
      if (el) {
        const byCluster = {};
        mod.scatter.forEach(p => { (byCluster[p.cluster] = byCluster[p.cluster] || []).push(p); });
        const datasets = Object.keys(byCluster).map(k => ({
          label: `Cluster ${k}`,
          data: byCluster[k].map(p => ({x: p.x, y: p.y, label: `Frequency ${fmtId(p.x)} · Monetary ${window.formatMoney ? window.formatMoney(p.y) : fmtId(p.y)}`})),
          backgroundColor: chartColors[Number(k) % chartColors.length] + "cc",
          borderColor: chartColors[Number(k) % chartColors.length],
          pointRadius: 3, pointHoverRadius: 5
        }));
        new Chart(el, {type: "scatter", data: {datasets},
          options: {responsive: true, maintainAspectRatio: false,
            plugins: {legend: {labels: {usePointStyle: true, boxWidth: 8, padding: 14, color: "#c2cfdf"}}, tooltip: {callbacks: {label: c => `F: ${fmtId(c.raw.x)} · M: ${window.formatMoney ? window.formatMoney(c.raw.y) : fmtId(c.raw.y)}`}}},
            scales: {
              x: {title: {display: true, text: "Frequency", color: "#8fa1b9"}, ticks: {color: "#8fa1b9"}, grid: {color: "rgba(100,125,158,.15)"}},
              y: {title: {display: true, text: "Monetary (Rp)", color: "#8fa1b9"}, ticks: {color: "#8fa1b9", callback: v => new Intl.NumberFormat("id-ID", {notation: "compact"}).format(v)}, grid: {color: "rgba(100,125,158,.15)"}}
            }}});
      }
      renderBoxplot("clusterBoxplotChart", mod.cluster_boxplots);
    }
    // --- Recommendations: priority doughnut ---
    if (mod.page === "recommendations") {
      const recs = mod.recommendations || [];
      if (recs.length) {
        document.getElementById("recPriorityEmpty")?.setAttribute("hidden","");
        const counts = {};
        recs.forEach(r => counts[r.priority] = (counts[r.priority] || 0) + 1);
        const el = document.getElementById("recPriorityChart");
        if (el) new Chart(el, {type: "doughnut",
          data: {labels: Object.keys(counts), datasets: [{data: Object.values(counts), backgroundColor: chartColors, borderColor: "#131f33", borderWidth: 3}]},
          options: {responsive: true, maintainAspectRatio: false, cutout: "62%",
            plugins: {legend: {position: "bottom", labels: {usePointStyle: true, boxWidth: 7, padding: 14, color: "#c2cfdf"}}}}});
      }
      // Top products bar
      const tp = mod.results?.top_products || [];
      if (tp.length) {
        document.getElementById("recProductsEmpty")?.setAttribute("hidden","");
        const el = document.getElementById("recProductsChart");
        if (el) new Chart(el, {type: "bar",
          data: {labels: tp.map(x => x.product), datasets: [{label: "Penjualan", data: tp.map(x => x.sales), backgroundColor: tp.map((_, i) => chartColors[i % chartColors.length]), borderRadius: 5}]},
          options: {indexAxis: "y", responsive: true, maintainAspectRatio: false,
            plugins: {legend: {display: false}, tooltip: {callbacks: {label: c => window.formatMoney ? window.formatMoney(c.raw) : fmtId(c.raw)}}},
            scales: {x: {beginAtZero: true, ticks: {color: "#8fa1b9", callback: v => new Intl.NumberFormat("id-ID", {notation: "compact"}).format(v)}}, y: {grid: {display: false}, ticks: {color: "#8fa1b9"}}}}});
      }
      // Rules by lift (bar)
      const rl = mod.rules || [];
      if (rl.length) {
        document.getElementById("recRulesEmpty")?.setAttribute("hidden","");
        const top = rl.slice(0, 8);
        const el = document.getElementById("recRulesChart");
        if (el) new Chart(el, {type: "bar",
          data: {labels: top.map(r => `${r.antecedents || r.antecedents_text || "?"} → ${r.consequents || r.consequents_text || "?"}`),
            datasets: [{label: "Lift", data: top.map(r => r.lift), backgroundColor: "#14b8a6", borderRadius: 5}]},
          options: {indexAxis: "y", responsive: true, maintainAspectRatio: false,
            plugins: {legend: {display: false}, tooltip: {callbacks: {label: c => `Lift ${Number(c.raw).toFixed(2)}`}}},
            scales: {x: {beginAtZero: true, ticks: {color: "#8fa1b9"}}, y: {grid: {display: false}, ticks: {color: "#8fa1b9", font: {size: 9}}}}}});
      }
      // Clusters monetary (bar)
      const cl2 = mod.clusters || [];
      if (cl2.length) {
        document.getElementById("recClustersEmpty")?.setAttribute("hidden","");
        const el = document.getElementById("recClustersChart");
        if (el) new Chart(el, {type: "bar",
          data: {labels: cl2.map(c => `C${c.cluster} (${c.count} pelanggan)`),
            datasets: [{label: "Monetary mean (Rp)", data: cl2.map(c => c.monetary), backgroundColor: cl2.map((_, i) => chartColors[i % chartColors.length]), borderRadius: 5}]},
          options: {responsive: true, maintainAspectRatio: false,
            plugins: {legend: {display: false}, tooltip: {callbacks: {label: c => window.formatMoney ? window.formatMoney(c.raw) : fmtId(c.raw)}}},
            scales: {x: {grid: {display: false}, ticks: {color: "#8fa1b9"}}, y: {beginAtZero: true, ticks: {color: "#8fa1b9", callback: v => new Intl.NumberFormat("id-ID", {notation: "compact"}).format(v)}, grid: {color: "rgba(100,125,158,.15)"}}}}});
      }
    }
  }
})();