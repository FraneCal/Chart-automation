const allPlots = [];
const colorPalette = ["#3498db", "#2ecc71", "#e67e22", "#9b59b6", "#e74c3c", "#1abc9c", "#f39c12"];
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

document.getElementById("fileInput").addEventListener("change", function(e) {
  const files = e.target.files;
  if (!files.length) return;

  const plotsDiv = document.getElementById("plots");
  plotsDiv.innerHTML = "";
  allPlots.length = 0;
  plotCounter = 0;

  [...files].forEach(file => {
    const reader = new FileReader();
    reader.onload = function(event) {
      const text = event.target.result;
      let lines = text.trim().split("\n");
      if (lines.length < 2) return;
      lines.splice(1,1);

      let headers = lines[0].split("\t").map(h => h.trim());
      let userIdx = headers.indexOf("User");
      let flowIdx = headers.indexOf("Flow");
      let dpmIdx  = headers.indexOf("DPM2");

      let data = [];
      for (let i = 1; i < lines.length; i++) {
        let cols = lines[i].split("\t");
        let row = {
          User: parseFloat(cols[userIdx].replace(",", ".")),
          Flow: parseFloat(cols[flowIdx].replace(",", ".")),
          DPM2: parseFloat(cols[dpmIdx].replace(",", "."))
        };
        if (!isNaN(row.User) && !isNaN(row.Flow) && !isNaN(row.DPM2)) {
          data.push(row);
        }
      }
      if (data.length === 0) return;

      let uniqueUsers = [...new Set(data.map(d => d.User))].sort((a,b)=>a-b);
      let traces = [];
      let layout, exportData, exportCols, plotType = "";
      const traceColor = colorPalette[plotCounter % colorPalette.length];
      const label = getLabelFromFilename(file.name);

      if (uniqueUsers.length === 1 && uniqueUsers[0] === 1) {
        // --- Qband Setting 1 ---
        plotType = "Qband1";
        traces = [{
          x: data.map(d => d.DPM2),
          y: data.map(d => d.Flow),
          mode: "markers+lines", type: "scatter", name: label,
          line: {color: traceColor}, marker: {color: traceColor}
        }];
        const maxY = Math.max(...data.map(d => d.Flow));
        layout = {
          title: "Qband at Setting 1",
          xaxis: { title: "Dvp [bar]", range: [0,8] },
          yaxis: { title: "Flow [m³/h]", range: [0, getNiceMax(maxY)] },
          legend: { orientation: "h", y: -0.4, x: 0.5, xanchor: "center" }
        };
        exportData = data.map(d => ({DPM2: d.DPM2, Flow: d.Flow}));
        exportCols = ["DPM2","Flow"];

      } else if (uniqueUsers.length === 1 && uniqueUsers[0] === 10) {
        // --- Qband Setting 10 ---
        plotType = "Qband10";
        traces = [{
          x: data.map(d => d.DPM2),
          y: data.map(d => d.Flow),
          mode: "markers+lines", type: "scatter", name: label,
          line: {color: traceColor}, marker: {color: traceColor}
        }];
        const maxY = Math.max(...data.map(d => d.Flow));
        layout = {
          title: "Qband at Setting 10",
          xaxis: { title: "Dvp [bar]", range: [0,7] },
          yaxis: { title: "Flow [m³/h]", range: [0, getNiceMax(maxY)] },
          legend: { orientation: "h", y: -0.4, x: 0.5, xanchor: "center" }
        };
        exportData = data.map(d => ({DPM2: d.DPM2, Flow: d.Flow}));
        exportCols = ["DPM2","Flow"];

       } else if (uniqueUsers.length === 1 && uniqueUsers[0] === 2) {
        // --- Qband Setting 2 ---
        plotType = "Qband2";
        traces = [{
          x: data.map(d => d.DPM2),
          y: data.map(d => d.Flow),
          mode: "markers+lines", type: "scatter", name: label,
          line: {color: traceColor}, marker: {color: traceColor}
        }];
        const maxY = Math.max(...data.map(d => d.Flow));
        layout = {
          title: "Qband at Setting 2",
          xaxis: { title: "Dvp [bar]", range: [0,7] },
          yaxis: { title: "Flow [m³/h]", range: [0, getNiceMax(maxY)] },
          legend: { orientation: "h", y: -0.4, x: 0.5, xanchor: "center" }
        };
        exportData = data.map(d => ({DPM2: d.DPM2, Flow: d.Flow}));
        exportCols = ["DPM2","Flow"];


      } else {
        // --- Flow characteristic ---
        plotType = "FlowChar";
        let grouped = {};
        data.forEach(d => {
          if (!grouped[d.User]) grouped[d.User] = [];
          grouped[d.User].push(d.Flow);
        });
        let users = Object.keys(grouped).map(u => parseFloat(u)).sort((a,b)=>a-b);
        let flows = users.map(u => grouped[u].reduce((a,b)=>a+b)/grouped[u].length);

        const mainTrace = {
          x: users, y: flows,
          mode: "markers+lines", type: "scatter", name: label,
          line: {color: traceColor}, marker: {color: traceColor}
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
          const upper100 = f100 * 1.10;
          const lower100 = f100 * 0.90;

          const upper = users.map(u => {
            if (u < setting20 || u > setting100) return null;
            const ratio = (u - setting20) / (setting100 - setting20);
            return upper20 + (upper100 - upper20) * ratio;
          });
          const lower = users.map(u => {
            if (u < setting20 || u > setting100) return null;
            const ratio = (u - setting20) / (setting100 - setting20);
            return lower20 + (lower100 - lower20) * ratio;
          });

          limitTraces = [
            { x: users, y: upper, mode: "lines", line: {color: "red", dash: "dash"}, name: "Upper limit" },
            { x: users, y: lower, mode: "lines", line: {color: "red", dash: "dash"}, name: "Lower limit" }
          ];
        }

        traces = [mainTrace, ...limitTraces];
        const maxY = Math.max(...flows, ...limitTraces.flatMap(t => t.y.filter(v => v !== null)));

        layout = {
          title: "Flow characteristic",
          xaxis: { title: "Setting", range: [0,10], dtick: 1 },
          yaxis: { title: "Flow [m³/h]", range: [0, getNiceMax(maxY)] },
          legend: { orientation: "h", y: -0.4, x: 0.5, xanchor: "center" }
        };
        exportData = users.map((u,i)=>({User:u, Flow:flows[i]}));
        exportCols = ["User","Flow"];
      }

      // ---- Render each single plot with buttons ----
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
        let ws = XLSX.utils.json_to_sheet(exportData, {header: exportCols});
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

      Plotly.newPlot(plotDiv, traces, layout, {responsive: true}).then(gd => {
        Plotly.Plots.resize(gd);

        pngBtn.onclick = () => {
          Plotly.downloadImage(gd, {
            format: "png",
            filename: file.name.replace(/\.[^/.]+$/, "") + "_plot",
            width: 1600,
            height: 800
          });
        };

        // ✅ store original traces/layout too for later combination
        allPlots.push({
          fileName: file.name,
          plotDiv: gd,
          exportData,
          exportCols,
          plotType,
          data: traces,
          layout
        });

        document.getElementById("globalButtons").style.display = "inline-flex";
        plotCounter++;
      });
    };
    reader.readAsText(file, "utf-8");
  });
});

// ---- Global buttons ----
document.getElementById("downloadAllPNGs").addEventListener("click", async () => {
  if (!allPlots.length) return;

  const zip = new JSZip();
  for (let item of allPlots) {
    const url = await Plotly.toImage(item.plotDiv, {format:"png", width:1600, height:800});
    const base64 = url.split(",")[1];
    zip.file(item.fileName.replace(/\.[^/.]+$/, "") + "_plot.png", base64, {base64:true});
  }
  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, "All_Plots_PNGs.zip");
});

document.getElementById("downloadAllExcels").addEventListener("click", () => {
  const zip = new JSZip();
  allPlots.forEach(item => {
    let ws = XLSX.utils.json_to_sheet(item.exportData, {header:item.exportCols});
    let wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    let wbout = XLSX.write(wb, {bookType:'xlsx', type:'array'});
    zip.file(item.fileName.replace(/\.[^/.]+$/, "") + ".xlsx", wbout);
  });
  zip.generateAsync({type:"blob"}).then(content => {
    saveAs(content, "All_Excels.zip");
  });
});

document.getElementById("downloadCombinedExcel").addEventListener("click", () => {
  if (!allPlots.length) return;
  let wb = XLSX.utils.book_new();
  allPlots.forEach(item => {
    let ws = XLSX.utils.json_to_sheet(item.exportData, {header:item.exportCols});
    let sheetName = item.fileName.replace(/\.[^/.]+$/, "").substring(0,31).replace(/[/\\?*[\]:]/g,"_");
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });
  XLSX.writeFile(wb, "Combined_Data.xlsx");
});

// ---- Combined PNGs by type ----
document.getElementById("downloadCombinedPNG").addEventListener("click", async () => {
  if (!allPlots.length) return;

  const groups = { FlowChar: [], Qband1: [], Qband10: [] };
  allPlots.forEach(item => {
    if (groups[item.plotType]) groups[item.plotType].push(item);
  });

  for (let type of ["FlowChar", "Qband1", "Qband10"]) {
    const items = groups[type];
    if (items.length === 0) continue;

    const combined = {data: [], layout: {}};

    items.forEach(item => {
      item.data.forEach(trace => {
        if (trace.name === "Upper limit" || trace.name === "Lower limit") return;
        combined.data.push({...trace});
      });
    });

    let titleText = "";
    if (type === "FlowChar") titleText = "Flow characteristic";
    if (type === "Qband1") titleText = "Qband at Setting 1";
    if (type === "Qband10") titleText = "Qband at Setting 10";

    const maxY = Math.max(...combined.data.flatMap(t => t.y));
    combined.layout = {
      title: titleText,
      xaxis: { title: items[0].layout.xaxis.title.text },
      yaxis: { title: items[0].layout.yaxis.title.text, range: [0, getNiceMax(maxY)] },
      legend: { orientation: "h", y: -0.3, x: 0.5, xanchor: "center" },
      width: 1600, height: 800
    };

    const tempDiv = document.createElement("div");
    document.body.appendChild(tempDiv);
    await Plotly.newPlot(tempDiv, combined.data, combined.layout);

    const url = await Plotly.toImage(tempDiv, {format:"png", width:1600, height:800});
    const a = document.createElement("a");
    a.href = url;
    a.download = `${titleText.replace(/\s+/g,"_")}.png`;
    a.click();

    Plotly.purge(tempDiv);
    tempDiv.remove();
  }
});
