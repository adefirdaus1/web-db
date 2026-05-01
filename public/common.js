export function initLaporan(config) {
  const {
    endpoint,
    getParams,
    tableId,
    loadingId,
    btnLoadId,
    btnExportId,
    btnPDFId,
    summaryMap
  } = config;

  const table = document.getElementById(tableId);
  const loading = document.getElementById(loadingId);
  const btnLoad = document.getElementById(btnLoadId);
  const btnExport = document.getElementById(btnExportId);
  const btnPDF = document.getElementById(btnPDFId);

  let lastData = [];

  btnLoad.onclick = async () => {
    const params = getParams();

    loading.style.display = "block";
    table.innerHTML = "";

    const query = new URLSearchParams(params).toString();

    const res = await fetch(`${endpoint}?${query}`);
    const data = await res.json();

    lastData = data;

    btnExport.disabled = !data.length;
    btnPDF.disabled = !data.length;

    renderTable(data);
    renderSummary(data);

    loading.style.display = "none";
  };

  function renderTable(data){
    if(!data.length) return;

    let h="<tr>";
    Object.keys(data[0]).forEach(k=>{
      if(k!=="kdCab") h+=`<th>${k}</th>`;
    });
    h+="</tr>";
    table.innerHTML=h;

    data.forEach(r=>{
      let tr="<tr>";
      Object.entries(r).forEach(([k,v])=>{
        if(k==="kdCab") return;
        tr+=`<td>${v}</td>`;
      });
      tr+="</tr>";
      table.innerHTML+=tr;
    });
  }

  function renderSummary(data){
    if(!summaryMap) return;

    let count = {};
    Object.keys(summaryMap).forEach(k=>count[k]=0);

    data.forEach(r=>{
      if(count[r.Keterangan] !== undefined){
        count[r.Keterangan]++;
      }
    });

    Object.entries(summaryMap).forEach(([key, elId])=>{
      document.getElementById(elId).innerText = count[key] || 0;
    });
  }
}