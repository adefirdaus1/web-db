const sql = require("mssql");

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

async function test() {
  try {
    await sql.connect(config);
    console.log("Koneksi berhasil");

    const result = await sql.query(`
      SELECT TOP 5 *
      FROM dbo.Pelanggan
    `);

    console.log(result.recordset);
  } catch (err) {
    console.log("Error:", err);
  }
}

test();