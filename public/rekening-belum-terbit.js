const btnLoad = document.getElementById("btnLoad");
const table = document.getElementById("table");
const periode = document.getElementById("periode");
const cabang = document.getElementById("cabang");
const btnExport = document.getElementById("btnExport");
const btnPDF = document.getElementById("btnPDF");
const loading = document.getElementById("loading");

let lastData = [];

periode.addEventListener("input", () => {
  btnLoad.disabled = periode.value.length !== 6;
});

/* LOAD */
btnLoad.onclick = async function(){
  try{
    loading.style.display="block";
    table.innerHTML="";

    const res = await fetch(`/rekening-belum-terbit?periode=${periode.value}&kdCab=${cabang.value}`);
    const data = await res.json();

    lastData = data;
    btnExport.disabled = !data.length;
    btnPDF.disabled = !data.length;

    renderTable(data);
    renderSummary(data);

  }catch(err){
    console.error(err);
  }finally{
    loading.style.display="none";
  }
};

/* TABLE */
function renderTable(data){
  if(!data.length){
    table.innerHTML="<tr><td>Tidak ada data</td></tr>";
    return;
  }

  let cols = Object.keys(data[0]).filter(k=>k!=="kdCab");

  let thead="<thead><tr>";
  cols.forEach(c=>thead+=`<th>${c}</th>`);
  thead+="</tr></thead>";

  let tbody="<tbody>";
  data.forEach(r=>{
    let tr="<tr>";
    cols.forEach(c=>tr+=`<td>${r[c]}</td>`);
    tr+="</tr>";
    tbody+=tr;
  });
  tbody+="</tbody>";

  table.innerHTML=thead+tbody;
}

/* SUMMARY */
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

/* ROW CLICK */
table.addEventListener("click", e=>{
  let tr=e.target.closest("tr");
  if(!tr || tr.parentElement.tagName!=="TBODY") return;

  document.querySelectorAll("tbody tr").forEach(r=>r.classList.remove("active"));
  tr.classList.add("active");
});

/* EXCEL */
btnExport.onclick = function(){
  if(!lastData.length) return;

  const wb=XLSX.utils.book_new();

  const clean=lastData.map(r=>{
    let o={};
    Object.entries(r).forEach(([k,v])=>{
      if(k!=="kdCab") o[k]=v;
    });
    return o;
  });

  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(clean),"Data");

  XLSX.writeFile(wb,`RekeningBelumTerbit_${periode.value}.xlsx`);
};

/* PDF */
btnPDF.onclick = function(){
  if(!lastData.length) return;

  const { jsPDF } = window.jspdf;

  let cols = Object.keys(lastData[0]).filter(k=>k!=="kdCab");
  let rows = lastData.map(r=>cols.map(c=>r[c]));

  let doc=new jsPDF("l");

  doc.autoTable({head:[cols],body:rows});

  doc.save(`RekeningBelumTerbit_${periode.value}.pdf`);
};