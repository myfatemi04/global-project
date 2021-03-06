// main file

import CsvReadableStream from "csv-reader";
import * as express from "express";
import { createReadStream, readFileSync } from "fs";
import fetch from "node-fetch";
import * as c from "csv-string";

let agg = JSON.parse(readFileSync("./agg.json"));

async function parseCSV(filename = "f500.csv") {
  const inputStream = createReadStream(filename, "utf8");

  // CSV: https://violationtracker.goodjobsfirst.org/prog.php?parent={short_name}&detail=csv_results

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
      .on("end", () => {
        resolve(rows);
      });
  });
}

const csvCache = {};

async function debugURLRequest(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36",
    },
  });
  const data = await response.text();
  return data;
}

async function parseCSVNetwork(url) {
  if (csvCache[url]) {
    return csvCache[url];
  }

  return new Promise((resolve, reject) => {
    fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36",
      },
    })
      .then((response) => {
        if (response.status != 200) {
          csvCache[url] = null;
          reject(new Error(`${response.status} ${response.statusText}`));
          return;
        }
        return response.text();
      })
      .then((text) => {
        const csv = c.parse(text);
        csvCache[url] = csv;
        resolve(csv);
      });
  });
}

function transformCSV(rows) {
  const columnTitles = rows[0];
  const transformedRows = [];
  for (let rowNumber = 1; rowNumber < rows.length; rowNumber++) {
    const row = rows[rowNumber];
    const object = {};
    for (let columnNumber = 0; columnNumber < row.length; columnNumber++) {
      object[columnTitles[columnNumber]] = row[columnNumber];
    }
    transformedRows.push(object);
  }
  return transformedRows;
}

let companies = [];

parseCSV().then((data) => {
  companies = transformCSV(data);
});

/*

companies is a list like:
[
  ...,
  {
    Rank: 49,
    Name: 'Walt Disney',
    sector: 'Media',
    Articles: '',
    'Unethical Practices': '',
    'Exploited Countries': '',
    Alternatives: ''
  },
  ...
]

So list[48].Name == 'Walt Disney'

*/

/**
 * Dictionary with the key being the short name, and the value being the violations.
 */

async function loadAllCompanies() {
  const violationsByCompany = {};
  const allCompanyNameMetadata = JSON.parse(
    readFileSync("./corporation_search_api/index.json", "utf8")
  );
  // await Promise.all(
  //   allCompanyNameMetadata.map(
  //     (companyNameMetadata) =>
  //       new Promise((resolve, reject) => {
  //         loadCompanyInformation(
  //           `./corporation_search_api/data/${companyNameMetadata.short_name}.csv`
  //         )
  //           .then((violations) => {
  //             violationsByCompany[companyNameMetadata.short_name] = violations;
  //             resolve();
  //           })
  //           .catch(reject);
  //       })
  //   )
  // );

  companyInfo.violations = violationsByCompany;
  companyInfo.companyNames = allCompanyNameMetadata;
}

const companyInfo = {
  violations: null,
  companyNames: null,
};

async function loadCompanyInformation(file) {
  return transformCSV(await parseCSV(file));
}

loadAllCompanies();

const app = express.default();

app.use(express.static("public"));

app.set("view engine", "hbs");

function getMatchingCompanies(name) {
  return companies.filter((company) =>
    company.Name.toLowerCase().startsWith(name.toLowerCase())
  );
}

app.get("/api/debug", async (req, res) => {
  const companyShortName = req.query.company;
  res.send(
    await debugURLRequest(
      `https://violationtracker.goodjobsfirst.org/prog.php?parent=${companyShortName}&detail=csv_results`
    )
  );
});

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

async function getViolationsCSVasJSON(companyShortName) {
  const url = `https://violationtracker.goodjobsfirst.org/prog.php?parent=${companyShortName}&detail=csv_results`;

  return await transformCSV(await parseCSVNetwork(url));
}

app.get("/company_info", async (req, res) => {
  const parentCompany = req.query.company; // .toLowerCase();
  if (!parentCompany) {
    res.render("not_found");
    return;
  }
  let parentCompanyShortName = null;
  for (let company of companyInfo.companyNames) {
    if (company.long_name.trim() == parentCompany.trim()) {
      parentCompanyShortName = company.short_name;
    }
  }

  const parentCompanyViolations = await getViolationsCSVasJSON(
    parentCompanyShortName
  );

  if (parentCompanyViolations == null) {
    res.render("not_found");
    return;
  }

  res.render("company_info", {
    violationsJSON: JSON.stringify(parentCompanyViolations),
    name: parentCompany,
    shortName: parentCompanyShortName,
    agg: JSON.stringify(agg),
  });

  // const companies = getMatchingCompanies(comp);
  // if (companies.length === 0) {
  //   res.render("not_found");
  //   return;
  // }
  // const company = companies[0];
  // res.render("company_info", {
  //   name: company.Name,
  //   revenue: 0,
  //   profit: 0,
  //   // revenue: company.revenue,
  //   // profit: company.profit,
  // });
  // return;
});

app.get("/", (req, res) => {
  res.render("search");
});

app.listen(process.env.PORT || 80, () => console.log("Listening"));
