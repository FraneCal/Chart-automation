const allPlots = [];
const colorPalette = [
  "#3498db",
  "#2ecc71",
  "#e67e22",
  "#9b59b6",
  "#e74c3c",
  "#1abc9c",
  "#f39c12"
];
let plotCounter = 0;

// Extract label from filename (everything after "_")
function getLabelFromFilename(filename) {
  const base = filename.replace(/\.[^/.]+$/, ""); // remove extension
  const parts = base.split("_");
  return parts.length > 1 ? parts.slice(1).join("_") : base;
}

// Helper: round up to the next "nice" number
function getNiceMax(value) {
  if (value <= 0) return 1;
  const order = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / order;
  let nice;
  if (normalized <= 1) nice = 1;
  else if (normalized <= 2) nice = 2;
  else if (normalized <= 5) nice = 5;
  else nice = 10;
  return nice * order;
}

document.getElementById("fileInput").addEventListener("change", function (e) {
  const files = e.target.files;
  if (!files.length) return;

  const plotsDiv = document.getElementById("plots");
  plotsDiv.innerHTML = "";
  allPlots.length = 0;
  plotCounter = 0;

  [...files].forEach((file) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      const text = event.target.result;
      let lines = text.trim().split("\n");
      if (lines.length < 2) return;
      lines.splice(1, 1); // Remove extra header line if present

      let headers = lines[0].split("\t").map((h) => h.trim());
      let userIdx = headers.indexOf("User");
      let flowIdx = headers.indexOf("Flow");
      let dpmIdx = headers.indexOf("DPM2");
      let posIdx = headers.indexOf("Position");
      let forceIdx = headers.indexOf("Force");

      let data = [];
      for (let i = 1; i < lines.length; i++) {
        let cols = lines[i].split("\t");
        let row = {
          User: userIdx !== -1 ? parseFloat(cols[userIdx].replace(",", ".")) : NaN,
          Flow: flowIdx !== -1 ? parseFloat(cols[flowIdx].replace(",", ".")) : NaN,
          DPM2: dpmIdx !== -1 ? parseFloat(cols[dpmIdx].replace(",", ".")) : NaN,
          Position: posIdx !== -1 ? parseFloat(cols[posIdx].replace(",", ".")) : NaN,
          Force: forceIdx !== -1 ? parseFloat(cols[forceIdx].replace(",", ".")) : NaN,
        };
        data.push(row);
      }

      // Remove rows with no useful numeric data
      data = data.filter((d) => Object.values(d).some((v) => !isNaN(v)));
      if (data.length === 0) return;

      const label = getLabelFromFilename(file.name);
      const traceColor = colorPalette[plotCounter % colorPalette.length];
      let traces = [];
      let layout = {};
      let exportData = [];
      let exportCols = [];
      let plotType = "";

      // ---- Force plot logic ----
      const hasPosition = posIdx !== -1 && data.some((d) => !isNaN(d.Position));
      const hasForce = forceIdx !== -1 && data.some((d) => !isNaN(d.Force));
      const hasFlow = flowIdx !== -1 && data.some((d) => d.Flow && d.Flow !== 0);
      const nonZeroPositions = hasPosition && data.some((d) => d.Position !== 0);

      if (hasForce && nonZeroPositions) {
        // NEW: check if first few positions are above 1
        const firstFew = data.slice(0, 5).map((d) => d.Position);
        const highPosition = firstFew.some((p) => p > 1);

        if (highPosition) {
          // --- Closing force at 6 bar ---
          traces = [
            {
              x: data.map((d) => d.Flow),
              y: data.map((d) => d.Force),
              mode: "markers+lines",
              type: "scatter",
              name: label,
              line: { color: traceColor },
              marker: { color: traceColor },
            },
            {
              x: [Math.min(...data.map((d) => d.Flow)), Math.max(...data.map((d) => d.Flow))],
              y: [100, 100],
              mode: "lines",
              name: "Limit 100 N",
              line: { color: "red", dash: "dash" },
            },
          ];

          layout = {
            title: "Closing force at 6 bar",
            xaxis: { title: "Flow [m³/h]" },
            yaxis: { title: "Force [N]" },
            legend: { orientation: "h", y: -0.3, x: 0.5, xanchor: "center" },
          };

          exportData = data.map((d) => ({ Flow: d.Flow, Force: d.Force }));
          exportCols = ["Flow", "Force"];
          plotType = "ClosingForcePlot";
        } else {
          // --- Force vs. Position ---
          traces = [
            {
              x: data.map((d) => d.Position),
              y: data.map((d) => d.Force),
              mode: "markers+lines",
              type: "scatter",
              name: label,
              line: { color: traceColor },
              marker: { color: traceColor },
            },
            {
              x: [Math.min(...data.map((d) => d.Position)), Math.max(...data.map((d) => d.Position))],
              y: [100, 100],
              mode: "lines",
              name: "Limit 100 N",
              line: { color: "red", dash: "dash" },
            },
          ];

          const maxY = Math.max(...data.map((d) => d.Force));
          layout = {
            title: hasFlow ? "Force with flow" : "Force without flow",
            xaxis: { title: "Position [mm]" },
            yaxis: { title: "Force [N]", range: [0, getNiceMax(maxY)] },
            legend: { orientation: "h", y: -0.3, x: 0.5, xanchor: "center" },
          };

          exportData = data.map((d) => ({ Position: d.Position, Force: d.Force }));
          exportCols = ["Position", "Force"];
          plotType = "ForcePlot";
        }
      }

      // ---- Existing Qband/FlowChar logic ----
      else {
        let uniqueUsers = [...new Set(data.map((d) => d.User))]
          .filter((x) => !isNaN(x))
          .sort((a, b) => a - b);

        if (uniqueUsers.length === 1 && uniqueUsers[0] === 1) {
          plotType = "Qband1";
          traces = [
            {
              x: data.map((d) => d.DPM2),
              y: data.map((d) => d.Flow),
              mode: "markers+lines",
              type: "scatter",
              name: label,
              line: { color: traceColor },
              marker: { color: traceColor },
            },
          ];
          const maxY = Math.max(...data.map((d) => d.Flow));
          layout = {
            title: "Qband at Setting 1",
            xaxis: { title: "Dvp [bar]", range: [0, 8] },
            yaxis: { title: "Flow [m³/h]", range: [0, getNiceMax(maxY)] },
            legend: { orientation: "h", y: -0.4, x: 0.5, xanchor: "center" },
          };
          exportData = data.map((d) => ({ DPM2: d.DPM2, Flow: d.Flow }));
          exportCols = ["DPM2", "Flow"];
        } else if (uniqueUsers.length === 1 && uniqueUsers[0] === 10) {
          plotType = "Qband10";
          traces = [
            {
              x: data.map((d) => d.DPM2),
              y: data.map((d) => d.Flow),
              mode: "markers+lines",
              type: "scatter",
              name: label,
              line: { color: traceColor },
              marker: { color: traceColor },
            },
          ];
          const maxY = Math.max(...data.map((d) => d.Flow));
          layout = {
            title: "Qband at Setting 10",
            xaxis: { title: "Dvp [bar]", range: [0, 7] },
            yaxis: { title: "Flow [m³/h]", range: [0, getNiceMax(maxY)] },
            legend: { orientation: "h", y: -0.4, x: 0.5, xanchor: "center" },
          };
          exportData = data.map((d) => ({ DPM2: d.DPM2, Flow: d.Flow }));
          exportCols = ["DPM2", "Flow"];
        } else if (uniqueUsers.length === 1 && uniqueUsers[0] === 2) {
          plotType = "Qband2";
          traces = [
            {
              x: data.map((d) => d.DPM2),
              y: data.map((d) => d.Flow),
              mode: "markers+lines",
              type: "scatter",
              name: label,
              line: { color: traceColor },
              marker: { color: traceColor },
            },
          ];
          const maxY = Math.max(...data.map((d) => d.Flow));
          layout = {
            title: "Qband at Setting 2",
            xaxis: { title: "Dvp [bar]", range: [0, 7] },
            yaxis: { title: "Flow [m³/h]", range: [0, getNiceMax(maxY)] },
            legend: { orientation: "h", y: -0.4, x: 0.5, xanchor: "center" },
          };
          exportData = data.map((d) => ({ DPM2: d.DPM2, Flow: d.Flow }));
          exportCols = ["DPM2", "Flow"];
        } else {
          // Flow characteristic
          plotType = "FlowChar";
          let grouped = {};
          data.forEach((d) => {
            if (!grouped[d.User]) grouped[d.User] = [];
            grouped[d.User].push(d.Flow);
          });
          let users = Object.keys(grouped)
            .map((u) => parseFloat(u))
            .sort((a, b) => a - b);
          let flows = users.map(
            (u) => grouped[u].reduce((a, b) => a + b) / grouped[u].length
          );

          const mainTrace = {
            x: users,
            y: flows,
            mode: "markers+lines",
            type: "scatter",
            name: label,
            line: { color: traceColor },
            marker: { color: traceColor },
          };

          // Add limits only for single plots
          let limitTraces = [];
          const setting20 = 2;
          const setting100 = 10;
          const idx20 = users.indexOf(setting20);
          const idx100 = users.indexOf(setting100);
          if (idx20 !== -1 && idx100 !== -1) {
            const f20 = flows[idx20];
            const f100 = flows[idx100];
            const upper20 = f20 * 1.25;
            const lower20 = f20 * 0.75;
            const upper100 = f100 * 1.1;
            const lower100 = f100 * 0.9;

            const upper = users.map((u) => {
              if (u < setting20 || u > setting100) return null;
              const ratio = (u - setting20) / (setting100 - setting20);
              return upper20 + (upper100 - upper20) * ratio;
            });
            const lower = users.map((u) => {
              if (u < setting20 || u > setting100) return null;
              const ratio = (u - setting20) / (setting100 - setting20);
              return lower20 + (lower100 - lower20) * ratio;
            });

            limitTraces = [
              {
                x: users,
                y: upper,
                mode: "lines",
                line: { color: "red", dash: "dash" },
                name: "Upper limit",
              },
              {
                x: users,
                y: lower,
                mode: "lines",
                line: { color: "red", dash: "dash" },
                name: "Lower limit",
              },
            ];
          }

          traces = [mainTrace, ...limitTraces];
          const maxY = Math.max(
            ...flows,
            ...limitTraces.flatMap((t) => t.y.filter((v) => v !== null))
          );

          layout = {
            title: "Flow characteristic",
            xaxis: { title: "Setting", range: [0, 10], dtick: 1 },
            yaxis: { title: "Flow [m³/h]", range: [0, getNiceMax(maxY)] },
            legend: { orientation: "h", y: -0.4, x: 0.5, xanchor: "center" },
          };
          exportData = users.map((u, i) => ({ User: u, Flow: flows[i] }));
          exportCols = ["User", "Flow"];
        }
      }

      // ---- Render each plot ----
      const container = document.createElement("div");
      container.className = "plot-container";

      const title = document.createElement("h3");
      title.textContent = file.name;
      container.appendChild(title);

      const buttons = document.createElement("div");
      buttons.className = "buttons";

      const excelBtn = document.createElement("button");
      excelBtn.textContent = "⬇ Excel (Raw data)";
      excelBtn.addEventListener("click", () => {
        let ws = XLSX.utils.json_to_sheet(exportData, { header: exportCols });
        let wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, file.name.replace(/\.[^/.]+$/, "") + ".xlsx");
      });
      buttons.appendChild(excelBtn);

      const plotDiv = document.createElement("div");
      plotDiv.className = "plot";

      const pngBtn = document.createElement("button");
      pngBtn.textContent = "⬇ PNG";
      buttons.appendChild(pngBtn);

      container.appendChild(buttons);
      container.appendChild(plotDiv);
      plotsDiv.appendChild(container);

      Plotly.newPlot(plotDiv, traces, layout, { responsive: true }).then((gd) => {
        Plotly.Plots.resize(gd);

        pngBtn.onclick = () => {
          Plotly.downloadImage(gd, {
            format: "png",
            filename: file.name.replace(/\.[^/.]+$/, "") + "_plot",
            width: 1600,
            height: 800,
          });
        };

        allPlots.push({
          fileName: file.name,
          plotDiv: gd,
          exportData,
          exportCols,
          plotType,
          data: traces,
          layout,
        });

        document.getElementById("globalButtons").style.display = "inline-flex";
        plotCounter++;
      });
    };
    reader.readAsText(file, "utf-8");
  });
});
