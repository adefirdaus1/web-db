const express = require("express");
const sql = require("mssql");
const cors = require("cors");

const app = express();
app.use(cors());
const path = require("path");
const publicPath = path.join(__dirname, "public");

/* BLOCK index.html */
app.get("/index.html", (req, res) => {
  return res.status(404).send("Not Found");
});

/* ROOT */
app.get("/", (req, res) => {
  res.redirect("/rekeningapps");
});

/* LANDING */
app.get("/rekeningapps", (req, res) => {
  res.sendFile(path.join(publicPath, "rekeningapps.html"));
});

/* HALAMAN */
app.get("/rekeningapps/belum-terbit", (req, res) => {
  res.sendFile(path.join(publicPath, "rekening-belum-terbit.html"));
});

app.get("/rekeningapps/rincian-posisi", (req, res) => {
  res.sendFile(path.join(publicPath, "rincian-posisi.html"));
});

app.get("/rekeningapps/pemakaian-minus", (req, res) => {
  res.sendFile(path.join(publicPath, "pemakaian-minus.html"));
});

app.get("/rekeningapps/duplikat-pemakaian", (req, res) => {
  res.sendFile(path.join(publicPath, "duplikat-pemakaian.html"));
});

app.get("/rekeningapps/rentang-pemakaian", (req, res) => {
  res.sendFile(path.join(publicPath, "rentang-pemakaian.html"));
});

app.get("/rekeningapps/simulasi-tarif", (req, res) => {
  res.sendFile(path.join(publicPath, "simulasi-tarif.html"));
});
/* STATIC (WAJIB PALING BAWAH) */
app.use(express.static(publicPath));

const config = {
  user: "ade",
  password: "ade",
  server: "103.203.234.42",
  database: "PDAMBill",
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

// ===== Helper blok 1–10, 11–20, 21–30, 31+ =====
function makeBlok(h1, h2, h3, h4){
  return [
    { min: 1,  max: 10,        harga: h1 },
    { min: 11, max: 20,        harga: h2 },
    { min: 21, max: 30,        harga: h3 },
    { min: 31, max: Infinity,  harga: h4 }
  ];
}

// ===== Tarif =====
const tarif = { DK: {}, LK: {} };

// --- LK ---
tarif.LK["SUM"] = makeBlok(1050,1050,1050,1250);
tarif.LK["SKS"] = makeBlok(1250,1250,1250,1500);
tarif.LK["IPM"] = makeBlok(2500,4200,5200,6700);
tarif.LK["TNI"] = makeBlok(2500,4200,5200,6700);
tarif.LK["LPU"] = makeBlok(1900,1900,2800,4500);
tarif.LK["LPT"] = makeBlok(2500,2500,5200,6200);
tarif.LK["RSP"] = makeBlok(2500,2500,3600,4600);
tarif.LK["RSS"] = makeBlok(4600,4700,6300,7400);
tarif.LK["NIK"] = makeBlok(2800,3800,4800,7000);
tarif.LK["NIM"] = makeBlok(4600,6300,8000,9500);
tarif.LK["NIB"] = makeBlok(6000,8100,10300,12300);
tarif.LK["INK"] = makeBlok(6200,8400,11000,13000);
tarif.LK["INM"] = makeBlok(6900,9300,12200,14500);
tarif.LK["INB"] = makeBlok(7200,9800,12800,15200);
tarif.LK["TK"]  = makeBlok(2000,3200,4000,5000);
tarif.LK["RT1"] = makeBlok(2000,3200,4000,5000);
tarif.LK["RT2"] = makeBlok(2200,3500,4300,5500);
tarif.LK["RT3"] = makeBlok(2500,4200,5200,6700);
tarif.LK["RT4"] = makeBlok(3200,5200,6500,8200);

// --- DK ---
tarif.DK["SUM"] = makeBlok(880,880,880,1070);
tarif.DK["SKS"] = makeBlok(1070,1070,1070,1290);
tarif.DK["IPM"] = makeBlok(2120,3590,4440,5770);
tarif.DK["TNI"] = makeBlok(2120,3590,4440,5770);
tarif.DK["LPU"] = makeBlok(1590,1590,2390,4000);
tarif.DK["LPT"] = makeBlok(2120,2120,4440,5330);
tarif.DK["RSP"] = makeBlok(2120,2120,3180,4070);
tarif.DK["RSS"] = makeBlok(3890,3910,5290,6250);
tarif.DK["NIK"] = makeBlok(2400,3260,4170,6160);
tarif.DK["NIM"] = makeBlok(3890,5290,6770,8130);
tarif.DK["NIB"] = makeBlok(5090,6920,8850,10620);
tarif.DK["INK"] = makeBlok(5240,7150,9430,11220);
tarif.DK["INM"] = makeBlok(5860,7990,10540,12540);
tarif.DK["INB"] = makeBlok(6160,8410,11090,13200);
tarif.DK["TK"]  = makeBlok(1590,2700,3330,4330);
tarif.DK["RT1"] = makeBlok(1590,2700,3330,4330);
tarif.DK["RT2"] = makeBlok(1760,2990,3700,4810);
tarif.DK["RT3"] = makeBlok(2120,3590,4440,5770);
tarif.DK["RT4"] = makeBlok(2830,4790,5920,7690);

// ===== Bea Admin (per golongan) =====
const beaADMMap = {
  SUM:900, SKS:1080, IPM:2160, TNI:2160, LPU:1620, LPT:2160,
  RSP:2160, RSS:2700, NIK:2160, NIM:2700, NIB:3420, INK:3420,
  INM:4860, INB:7200, TK:1620, RT1:1620, RT2:1800, RT3:2160, RT4:2880
};

// ===== Dana Meter 1/2" (per golongan) =====
const beaDMMap = {
  SUM:9100, SKS:10170, IPM:11590, TNI:11590, LPU:9630, LPT:11590,
  RSP:10340, RSS:16050, NIK:10340, NIM:11050, NIB:12830, INK:14080,
  INM:13890, INB:12800, RT1:9630, RT2:10700, RT3:11590, RT4:12120
};

function hitungTarif(gol, pemakaian, wilayah){
  const rules = tarif[wilayah]?.[gol];
  if (!rules) throw new Error("Golongan/tarif tidak ditemukan");

  const beaADM = beaADMMap[gol];
  const beaDM  = beaDMMap[gol];

  if (beaADM == null || beaDM == null) {
    throw new Error("Bea ADM/DM belum terdefinisi untuk golongan ini");
  }

  let beaAir = 0;
  let beaPasif = 0;

  const hitungBlok = (pakai) => {
    let total = 0;
    for (const r of rules) {
      if (pakai >= r.min) {
        const volume = Math.min(pakai, r.max) - (r.min - 1);
        total += volume * r.harga;
      }
    }
    return total;
  };

  if (pemakaian === 0) {
    beaPasif = hitungBlok(10); // rule pasif
  } else {
    beaAir = hitungBlok(pemakaian);
  }

  return {
    beaAir,
    beaPasif,
    beaADM,
    beaDM,
    totalTagihan: beaAir + beaPasif + beaADM + beaDM
  };
}

app.get("/laporan", async (req, res) => {
  try {
    await sql.connect(config);

    const { periodeAwal, periodeAkhir, tglAwal, tglAkhir, kdCab } = req.query;

    console.log("KD CABANG:", kdCab);

    const request = new sql.Request();

    request.input("PeriodeAwal", sql.VarChar, periodeAwal);
    request.input("PeriodeAkhir", sql.VarChar, periodeAkhir);
    request.input("TanggalAwal", sql.Date, tglAwal);
    request.input("TanggalAkhir", sql.Date, tglAkhir);
    request.input("kdCab", sql.VarChar, kdCab || null);

    const result = await request.query(`

WITH BaseData AS (
    SELECT 
        a.NoPelanggan,
        b.kdCab,
        a.NoRek,
        a.BeaAir,
        a.BeaADM,
        a.BeaDM,
        a.BeaPasif,
        pa.Gol,
        a.PakaiAir
    FROM PDAMBill.dbo.ft_TagihanAir(@PeriodeAkhir) a
    JOIN PDAMBill.dbo.Pelanggan b ON a.NoPelanggan = b.NoPelanggan
    JOIN PDAMBill.dbo.PemakaianAir pa 
        ON a.NoPelanggan = pa.NoPelanggan AND pa.Periode = @PeriodeAkhir
    WHERE NOT EXISTS (
        SELECT 1 FROM PDAMBill.dbo.PemakaianAir 
        WHERE NoPelanggan = a.NoPelanggan AND Periode = @PeriodeAwal
    )
),

PelangganPutus AS (
    SELECT 
        b.kdCab,
        @PeriodeAwal AS Periode,
        a.NoRek,
        a.NoPelanggan,
        p.Nama,
        p.Alamat,
        a.PakaiAir,
        a.BeaADM,
        a.BeaDM,
        a.BeaAir,
        a.BeaPasif,
        pa.Gol,
        'PUTUS' AS Keterangan
    FROM PDAMBill.dbo.ft_TagihanAir(@PeriodeAwal) a
    JOIN PDAMBill.dbo.Pelanggan p ON a.NoPelanggan = p.NoPelanggan
    JOIN PDAMBill.dbo.PemakaianAir pa 
        ON a.NoPelanggan = pa.NoPelanggan AND pa.Periode = @PeriodeAwal
    JOIN PDAMBill.dbo.Pelanggan b ON a.NoPelanggan = b.NoPelanggan
    WHERE NOT EXISTS (
        SELECT 1 FROM PDAMBill.dbo.ft_TagihanAir(@PeriodeAkhir) b2
        WHERE b2.NoPelanggan = a.NoPelanggan
    )
),

SR_Baru AS (
    SELECT 
        bd.kdCab,
        @PeriodeAkhir AS Periode,
        bd.NoRek,
        pd.NoPelanggan,
        p.Nama,
        p.Alamat,
        bd.PakaiAir,
        bd.BeaADM,
        bd.BeaDM,
        bd.BeaAir,
        bd.BeaPasif,
        bd.Gol,
        'SR BARU' AS Keterangan
    FROM PDAMPra.dbo.PendaftarDiPasang pd
    JOIN PDAMBill.dbo.Pelanggan p ON pd.NoPelanggan = p.NoPelanggan
    JOIN BaseData bd ON pd.NoPelanggan = bd.NoPelanggan
    WHERE pd.tanggal BETWEEN @TanggalAwal AND @TanggalAkhir
),

Sambung_Kembali AS (
    SELECT 
        bd.kdCab,
        @PeriodeAkhir AS Periode,
        bd.NoRek,
        bd.NoPelanggan,
        p.Nama,
        p.Alamat,
        bd.PakaiAir,
        bd.BeaADM,
        bd.BeaDM,
        bd.BeaAir,
        bd.BeaPasif,
        bd.Gol,
        'SAMBUNG KEMBALI' AS Keterangan
    FROM PDAMBill.dbo.ADMBayar ab
    JOIN PDAMBill.dbo.Pelanggan p ON ab.NoPelanggan = p.NoPelanggan
    JOIN BaseData bd ON ab.NoPelanggan = bd.NoPelanggan
    WHERE ab.tanggal BETWEEN @TanggalAwal AND @TanggalAkhir
    AND ab.TAG = 'ps'
),

Aktif_Kembali AS (
    SELECT 
        bd.kdCab,
        @PeriodeAkhir AS Periode,
        bd.NoRek,
        bd.NoPelanggan,
        p.Nama,
        p.Alamat,
        bd.PakaiAir,
        bd.BeaADM,
        bd.BeaDM,
        bd.BeaAir,
        bd.BeaPasif,
        bd.Gol,
        'AKTIF KEMBALI' AS Keterangan
    FROM PDAMPra.dbo.Aktifkembali ak
    JOIN PDAMBill.dbo.Pelanggan p ON ak.NoPel = p.NoPelanggan
    JOIN BaseData bd ON ak.NoPel = bd.NoPelanggan
    WHERE ak.tanggal BETWEEN @TanggalAwal AND @TanggalAkhir
)

SELECT * FROM (
  SELECT * FROM SR_Baru
  UNION ALL
  SELECT * FROM Sambung_Kembali
  UNION ALL
  SELECT * FROM Aktif_Kembali
  UNION ALL
  SELECT * FROM PelangganPutus
) x
WHERE (@kdCab IS NULL OR CAST(x.kdCab AS VARCHAR) = @kdCab)
ORDER BY NoPelanggan

    `);

    res.json(result.recordset);

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

app.get("/rekening-belum-terbit", async (req, res) => {
  try {
    await sql.connect(config);

    const { periode, kdCab } = req.query;

    const request = new sql.Request();
    request.input("periode", sql.VarChar, periode);
    request.input("kdCab", sql.VarChar, kdCab || null);

    const result = await request.query(`
      SELECT 
          p.NoPelanggan, 
          p.Nama, 
          p.Alamat, 
          p.Gol, 
          p.StaPel,
          p.kdCab
      FROM PDAMBill.dbo.Pelanggan p
      WHERE 
          p.StaPel = 'AT'
          AND NOT EXISTS (
              SELECT 1 
              FROM PDAMBill.dbo.PemakaianAir pa
              WHERE pa.Periode = @periode
              AND pa.NoPelanggan = p.NoPelanggan
          )
          AND (@kdCab IS NULL OR CAST(p.kdCab AS VARCHAR) = @kdCab)
      ORDER BY p.NoPelanggan
    `);

    res.json(result.recordset);

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});
app.get("/pemakaian-minus", async (req, res) => {
  try {
    await sql.connect(config);

    const { periode } = req.query;

    const request = new sql.Request();
    request.input("periode", sql.VarChar, periode);

    const result = await request.query(`
      SELECT 
          a.NoPelanggan,
          b.Nama,
          b.Alamat,
          b.Gol,
		  b.kdCab,
          a.PakaiAir AS Pemakaian,
          (a.beaDM + a.beaADM) AS BebanTetap,
          a.BeaAir AS BiayaAir,
          a.BeaPasif AS BiayaPasif,
          (a.beaDM + a.beaADM + a.BeaAir + a.BeaPasif) AS TotalTagihan,
          @periode AS Periode
      FROM PDAMBill.dbo.ft_TagihanAir(@periode) a  
      JOIN PDAMBill.dbo.Pelanggan b ON a.NoPelanggan = b.NoPelanggan
      WHERE a.PakaiAir < 0
      ORDER BY a.PakaiAir DESC
    `);

    res.json(result.recordset);

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

app.get("/duplikat-pemakaian", async (req, res) => {
  try {
    await sql.connect(config);

    const { periode, kdCab } = req.query;

    const request = new sql.Request();
    request.input("periode", sql.VarChar, periode);
    request.input("kdCab", sql.VarChar, kdCab || null);

    const result = await request.query(`
      SELECT 
          pa.NoPelanggan,
          p.Nama,
          p.Alamat,
          p.Gol,
          p.kdCab,
          COUNT(*) AS JumlahDuplikat,
          @periode AS Periode
      FROM PDAMBill.dbo.PemakaianAir pa
      JOIN PDAMBill.dbo.Pelanggan p 
        ON pa.NoPelanggan = p.NoPelanggan
      WHERE 
          pa.Periode = @periode
          AND (@kdCab IS NULL OR CAST(p.kdCab AS VARCHAR) = @kdCab)
      GROUP BY 
          pa.NoPelanggan, p.Nama, p.Alamat, p.Gol, p.kdCab
      HAVING COUNT(*) > 1
      ORDER BY JumlahDuplikat DESC
    `);

    res.json(result.recordset);

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

app.get("/rentang-pemakaian", async (req, res) => {
  try {
    await sql.connect(config);

    const { periode, min, max, kdCab } = req.query;

    const request = new sql.Request();
    request.input("periode", sql.VarChar, periode);
    request.input("min_pakai", sql.Int, min ?? 0);
    request.input("max_pakai", sql.Int, max ?? 0);
    request.input("kdCab", sql.VarChar, kdCab || null);

    const result = await request.query(`
      SELECT 
          t.NoPelanggan,
          pl.Nama,
          pl.Alamat,
          pl.Gol,
          pl.kdCab,
          t.PakaiAir,
          (t.beaDM + t.beaADM) AS BebanTetap,
          t.BeaAir,
          t.BeaPasif,
          (t.beaDM + t.beaADM + t.BeaAir + t.BeaPasif) AS TotalTagihan,
          @periode AS Periode
      FROM PDAMBill.dbo.ft_TagihanAir(@periode) t
      JOIN PDAMBill.dbo.Pelanggan pl 
        ON t.NoPelanggan = pl.NoPelanggan
      WHERE 
          t.PakaiAir BETWEEN @min_pakai AND @max_pakai
          AND (@kdCab IS NULL OR CAST(pl.kdCab AS VARCHAR) = @kdCab)
      ORDER BY t.NoPelanggan ASC
    `);

    res.json(result.recordset);

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

app.get("/simulasi-tarif", (req, res) => {
  try {
    const { gol, pakai, wilayah } = req.query;

    if (!gol || !wilayah) {
      return res.status(400).json({ error: "Parameter gol & wilayah wajib" });
    }

    const pemakaian = parseInt(pakai || 0, 10);
    if (Number.isNaN(pemakaian) || pemakaian < 0) {
      return res.status(400).json({ error: "Pemakaian tidak valid" });
    }

    const hasil = hitungTarif(gol, pemakaian, wilayah);

    res.json({
      gol,
      wilayah,
      pemakaian,
      ...hasil
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/simulasi-tarif", (req, res) => {
  try {
    const { gol, pakai, wilayah } = req.query;

    if (!gol || !wilayah) {
      return res.status(400).json({ error: "Parameter gol & wilayah wajib" });
    }

    const pemakaian = parseInt(pakai || 0, 10);
    if (Number.isNaN(pemakaian) || pemakaian < 0) {
      return res.status(400).json({ error: "Pemakaian tidak valid" });
    }

    const hasil = hitungTarif(gol, pemakaian, wilayah);

    res.json({
      gol,
      wilayah,
      pemakaian,
      ...hasil
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server jalan di port " + PORT);
});