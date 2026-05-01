const btnLoad = document.getElementById("btnLoad");
const btnExport = document.getElementById("btnExport");
const btnPDF = document.getElementById("btnPDF");
const table = document.getElementById("table");
const periode = document.getElementById("periode");
const cabang = document.getElementById("cabang");
const loading = document.getElementById("loading");

let lastData = [];

periode.addEventListener("input",()=>{
  btnLoad.disabled = periode.value.length !== 6;
});

btnLoad.onclick = async ()=>{
  loading.style.display="block";
  table.innerHTML="";

  const res = await fetch(`/duplikat-pemakaian?periode=${periode.value}&kdCab=${cabang.value}`);
  const data = await res.json();

  lastData = data;

  btnExport.disabled = !data.length;
  btnPDF.disabled = !data.length;

  renderTable(data);
  renderSummary(data);

  loading.style.display="none";
};

function renderTable(data){
  if(!data.length){
    table.innerHTML="<tr><td>Tidak ada data</td></tr>";
    return;
  }

  const cols = Object.keys(data[0]).filter(k=>k!=="kdCab");

  let thead="<thead><tr>";
  cols.forEach(c=>thead+=`<th>${c}</th>`);
  thead+="</tr></thead>";

  let tbody="<tbody>";

  data.forEach(r=>{
    let tr="<tr>";
    cols.forEach(c=>{
      let val=r[c];

      if(c==="JumlahDuplikat"){
        tr+=`<td style="color:#f59e0b;font-weight:bold">${val}</td>`;
      } else {
        tr+=`<td>${val}</td>`;
      }
    });
    tr+="</tr>";
    tbody+=tr;
  });

  tbody+="</tbody>";
  table.innerHTML=thead+tbody;
}

function renderSummary(data){
  let u=0,s=0,a=0;

  data.forEach(r=>{
    if(r.kdCab==1) u++;
    if(r.kdCab==2) s++;
    if(r.kdCab==3) a++;
  });

  total.innerText=data.length;
  ungaran.innerText=u;
  salatiga.innerText=s;
  ambarawa.innerText=a;
}

function clean(arr){
  return arr.map(r=>{
    let o={};
    Object.entries(r).forEach(([k,v])=>{
      if(k!=="kdCab") o[k]=v;
    });
    return o;
  });
}

/* EXCEL */
btnExport.onclick=()=>{
  if(!lastData.length) return;

  const wb = XLSX.utils.book_new();
  const cabMap={"1":"Ungaran","2":"Salatiga","3":"Ambarawa"};

  const cleanAll = clean(lastData);

  if(!cabang.value){
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(cleanAll),"Semua");

    let grouped={Ungaran:[],Salatiga:[],Ambarawa:[]};

    lastData.forEach(r=>{
      let name=cabMap[r.kdCab];
      if(grouped[name]) grouped[name].push(r);
    });

    Object.entries(grouped).forEach(([n,d])=>{
      if(d.length){
        XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(clean(d)),n);
      }
    });

  } else {
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(cleanAll),"Data");
  }

  XLSX.writeFile(wb,`DuplikatPemakaian_${periode.value}.xlsx`);
};

/* PDF */
btnPDF.onclick=()=>{
  if(!lastData.length) return;

  const { jsPDF } = window.jspdf;

  const cols = Object.keys(lastData[0]).filter(k=>k!=="kdCab");
  const rows = lastData.map(r=>cols.map(c=>r[c]));

  const doc = new jsPDF("l");

  doc.text(`Duplikat Pemakaian - ${periode.value}`,14,10);

  doc.autoTable({
    head:[cols],
    body:rows,
    startY:15
  });

  doc.save(`DuplikatPemakaian_${periode.value}.pdf`);
};