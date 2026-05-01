document.addEventListener("DOMContentLoaded", () => {
  const p2 = document.getElementById("p2");
  const btnLoad = document.getElementById("btnLoad");
  const btnExport = document.getElementById("btnExport");
  const btnPDF = document.getElementById("btnPDF");
  const table = document.getElementById("table");
  const loading = document.getElementById("loading");
  const cabang = document.getElementById("cabang");

  let lastData = [];

  function getPrevPeriode(p){
    let y = parseInt(p.substring(0,4));
    let m = parseInt(p.substring(4,6));
    m--;
    if(m === 0){ m = 12; y--; }
    return y + String(m).padStart(2,"0");
  }

  function tglAwal(p){
    return `${p.substring(0,4)}-${p.substring(4,6)}-01`;
  }

  function tglAkhir(p){
    let y=p.substring(0,4), m=p.substring(4,6);
    let last=new Date(y, m, 0).getDate();
    return `${y}-${m}-${last}`;
  }

  p2.addEventListener("input", () => {
    btnLoad.disabled = p2.value.length !== 6;
  });

  btnLoad.onclick = async function(){
    let p1 = getPrevPeriode(p2.value);

    loading.style.display="block";
    btnLoad.disabled = true;
    table.innerHTML="";

    try {
      const res = await fetch(`/laporan?periodeAwal=${p1}&periodeAkhir=${p2.value}&tglAwal=${tglAwal(p1)}&tglAkhir=${tglAkhir(p2.value)}&kdCab=${cabang.value}`);
      const d = await res.json();

      lastData = d;
      btnExport.disabled = !d.length;
      btnPDF.disabled = !d.length;

      renderTable(d);
      summary(d);
    } finally {
      loading.style.display="none";
      btnLoad.disabled = false;
    }
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

  function summary(data){
    let sr=0, sm=0, a=0, p=0;

    data.forEach(r=>{
      if(r.Keterangan==="SR BARU") sr++;
      if(r.Keterangan==="SAMBUNG KEMBALI") sm++;
      if(r.Keterangan==="AKTIF KEMBALI") a++;
      if(r.Keterangan==="PUTUS") p++;
    });

    document.getElementById("sr").innerText = sr;
    document.getElementById("sambung").innerText = sm;
    document.getElementById("aktif").innerText = a;
    document.getElementById("putus").innerText = p;
  }

  function makeHeaderBold(ws){
    if(!ws['!ref']) return;
    const range = XLSX.utils.decode_range(ws['!ref']);
    for(let C = range.s.c; C <= range.e.c; ++C){
      let addr = XLSX.utils.encode_cell({ r: 0, c: C });
      if(ws[addr]){
        ws[addr].s = { font: { bold: true } };
      }
    }
  }

  btnExport.onclick = function(){
    if(!lastData.length) return;

    let wb = XLSX.utils.book_new();

    const cabMap = {
      "1": "Ungaran",
      "2": "Salatiga",
      "3": "Ambarawa"
    };

    let clean = lastData.map(r=>{
      let o={};
      Object.entries(r).forEach(([k,v])=>{
        if(k!=="kdCab") o[k]=v;
      });
      return o;
    });

    if(!cabang.value){
      let wsGlobal = XLSX.utils.json_to_sheet(clean);
      makeHeaderBold(wsGlobal);
      XLSX.utils.book_append_sheet(wb, wsGlobal, "Semua");

      let grouped = {};
      lastData.forEach(r=>{
        let cabName = r.CABANG || cabMap[r.kdCab] || "LAINNYA";
        if(!grouped[cabName]) grouped[cabName] = [];
        let obj = {};
        Object.entries(r).forEach(([k,v])=>{
          if(k!=="kdCab") obj[k]=v;
        });
        grouped[cabName].push(obj);
      });

      Object.keys(grouped).forEach(name=>{
        let ws = XLSX.utils.json_to_sheet(grouped[name]);
        makeHeaderBold(ws);
        XLSX.utils.book_append_sheet(wb, ws, name.substring(0,31));
      });

      XLSX.writeFile(wb, `RincianPosisi_${p2.value}.xlsx`);
    } else {
      let ws = XLSX.utils.json_to_sheet(clean);
      makeHeaderBold(ws);
      XLSX.utils.book_append_sheet(wb, ws, "Data");

      let cabText = cabang.options[cabang.selectedIndex].text.replace(/\s+/g,"_");
      XLSX.writeFile(wb, `RincianPosisi_${p2.value}_${cabText}.xlsx`);
    }
  };

  btnPDF.onclick = function(){
    if(!lastData.length) return;

    const { jsPDF } = window.jspdf;

    let cols = Object.keys(lastData[0]).filter(k=>k!=="kdCab");
    let rows = lastData.map(r=>cols.map(c=>r[c]));

    let doc = new jsPDF("l");
    doc.autoTable({ head:[cols], body:rows });

    let cabangText = cabang.options[cabang.selectedIndex].text;

    let fileName = cabang.value
      ? `RincianPosisi_${p2.value}_${cabangText}.pdf`
      : `RincianPosisi_${p2.value}.pdf`;

    doc.save(fileName);
  };
});