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
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server jalan di port " + PORT);
});