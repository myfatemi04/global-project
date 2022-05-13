// main file

const fs = require("fs");
const CsvReadableStream = require("csv-reader");

async function parseCSV(filename = "f500.csv") {
  const inputStream = fs.createReadStream(filename, "utf8");

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
    fs.readFileSync("./corporation_search_api/index.json", "utf8")
  );
  await Promise.all(
    allCompanyNameMetadata.map(
      (companyNameMetadata) =>
        new Promise((resolve, reject) => {
          loadCompanyInformation(
            `./corporation_search_api/data/${companyNameMetadata.short_name}.csv`
          )
            .then((violations) => {
              violationsByCompany[companyNameMetadata.short_name] = violations;
              resolve();
            })
            .catch(reject);
        })
    )
  );

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

const express = require("express");

const app = express();

app.use(express.static("public"));

app.set("view engine", "hbs");

function getMatchingCompanies(name) {
  return companies.filter((company) =>
    company.Name.toLowerCase().startsWith(name.toLowerCase())
  );
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
  const parentCompany = req.query.company; // .toLowerCase();
  let parentCompanyShortName = null;
  for (let company of companyInfo.companyNames) {
    if (company.long_name == parentCompany) {
      parentCompanyShortName = company.short_name;
    }
  }

  const parentCompanyViolations =
    companyInfo.violations[parentCompanyShortName];

  if (parentCompanyViolations == null) {
    res.render("not_found");
    return;
  }

  res.render("company_info", {
    violationsJSON: JSON.stringify(parentCompanyViolations),
    name: parentCompany,
    shortName: parentCompanyShortName,
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
