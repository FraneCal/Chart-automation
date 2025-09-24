# Chart-automation

This project helps load measurement data, plot charts (like Q-band), and export results to Excel or PNG.

---

## What it does

- Read tab-delimited text files (`.txt`)
- Parse `User`, `Flow`, and `DPM2` columns
- Plot **Flow vs DPM2** curves
- Add reference lines:
  - Average flow
  - Upper and lower limits
  - Minimum DpV (e.g. 0.55 bar)
- Export data to **Excel** or **PNG**
- Export all plots together as a ZIP

---

## How to use

1. Open `index.html` in a browser  
2. Upload one or more `.txt` files  
3. The app will create plots automatically  
4. Use the buttons to:
   - **⬇ Excel** → download table of data  
   - **⬇ PNG** → download chart image  
   - **⬇ All** → download everything in one ZIP

---

## Data format

- Must be tab-delimited text  
- First row = column headers  
- Required columns:
  - `User` → test setting (e.g. 1, 10)  
  - `Flow` → measured flow  
  - `DPM2` → differential pressure  
- Decimal `.` or `,` is accepted  

---

## Boundaries (User = 1 or 10)

- Calculate **average flow**  
- Define margin:
  - User 10 → ±5%  
  - User 1 → ±10%  
- Plot:
  - Horizontal lines for avg, upper, lower  
  - Vertical line at `DpV min = 0.55 bar`

---

## Files in repo

```
index.html   → main UI
script.js    → parsing, plotting, export logic
styles.css   → styling
README.md    → documentation
```

---

## Dependencies

- [Plotly.js](https://plotly.com/javascript/) → charts  
- [SheetJS (XLSX)](https://github.com/SheetJS/sheetjs) → Excel export  
- [JSZip](https://stuk.github.io/jszip/) + FileSaver → ZIP download  

---

## License

MIT License © 2025

