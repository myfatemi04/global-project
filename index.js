// main file

const fs = require("fs");
const CsvReadableStream = require("csv-reader");

async function parseCSV() {
  const inputStream = fs.createReadStream("f500.csv", "utf8");

  return new Promise((resolve, reject) => {
    const rows = [];
    inputStream
      .pipe(
        new CsvReadableStream({
          parseNumbers: true,
          parseBooleans: true,
          trim: true,
        })
      )
      .on("data", (row) => rows.push(row))
      .on("end", () => {resolve(rows)});
  });
}

function transformCSV(raw_rows) {
  const headers = raw_rows[0];
  const tfm_rows = [];
  for (const row of raw_rows) {
    const obj = {};
    for (let i = 0; i < row.length; i++) {
      obj[headers[i]] = row[i];
    }
    tfm_rows.push(obj);
  }
  return tfm_rows;
}

let companies = [];

parseCSV().then((data) => {
  companies = transformCSV(data);
  console.log(companies)
});

// const companies = [
//   {
//     name: "nestle",
//     rating: 0,
//   },
//   {
//     name: "amazon",
//     rating: -10,
//   },
// ];

const express = require("express");

const app = express();

app.use(express.static('public'))

app.set("view engine", "hbs");

function getMatchingCompanies(name) {
  const results = [];
  for (const company of companies) {
    if (company.company.toLowerCase().includes(name)) {
      results.push(company);
    }
  }
  return results;
}

app.get("/api/company_info", (req, res) => {
  const name = req.query.company;
  if (name === null) {
    res.json({ status: "not_found" });
    return;
  }
  const results = getMatchingCompanies(name);
  if (results.length === 0) {
    res.json({ status: "not_found" });
    return;
  }
  res.json({ status: "found", companies: results });
  return;
});

app.get("/company_info", (req, res) => {
  const comp = req.query.company.toLowerCase()
  const companies = getMatchingCompanies(comp);
  if (companies.length === 0) {
    res.render("not_found");
    return;
  }
  const company = companies[0];
  res.render("company_info", {
    name: company.company,
    revenue: company.revenue,
    profit: company.profit,
  });
  return;
});

app.get("/", (req, res) => {
  res.render('search')
});

app.listen(80, () => console.log("Listening"));
