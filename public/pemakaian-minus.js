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

    const res = await fetch(`/pemakaian-minus?periode=${periode.value}&kdCab=${cabang.value}`);
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
    cols.forEach(c=>{
      let val = r[c];

      if(c==="Pemakaian" && val < 0){
        tr+=`<td style="color:#ef4444;font-weight:bold">${val}</td>`;
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

/* CLEAN DATA */
function cleanData(arr){
  return arr.map(r=>{
    let o={};
    Object.entries(r).forEach(([k,v])=>{
      if(k!=="kdCab") o[k]=v;
    });
    return o;
  });
}

/* EXCEL */
btnExport.onclick=function(){
  if(!lastData.length) return;

  const wb = XLSX.utils.book_new();
  const cabMap={"1":"Ungaran","2":"Salatiga","3":"Ambarawa"};

  const clean = cleanData(lastData);

  if(!cabang.value){

    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(clean),"Semua");

    let grouped={Ungaran:[],Salatiga:[],Ambarawa:[]};

    lastData.forEach(r=>{
      let name=cabMap[r.kdCab];
      if(grouped[name]) grouped[name].push(r);
    });

    Object.entries(grouped).forEach(([n,d])=>{
      XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(cleanData(d)),n);
    });

  }else{
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(clean),"Data");
  }

  XLSX.writeFile(wb,`PemakaianMinus_${periode.value}.xlsx`);
};

/* PDF */
btnPDF.onclick=function(){
  if(!lastData.length) return;

  const { jsPDF } = window.jspdf;

  let cols=Object.keys(lastData[0]).filter(k=>k!=="kdCab");
  let rows=lastData.map(r=>cols.map(c=>r[c]));

  let doc=new jsPDF("l");

  doc.autoTable({head:[cols],body:rows});

  doc.save(`PemakaianMinus_${periode.value}.pdf`);
};