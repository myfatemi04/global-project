import CsvReadableStream from "csv-reader";
import { createReadStream, readFileSync, writeFileSync } from "fs";

const companyInfo = {
  violations: {},
  companyNames: [],
};

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
async function loadCompanyInformation(file) {
  return transformCSV(await parseCSV(file));
}

async function loadAllCompanies() {
  const violationsByCompany = {};
  const allCompanyNameMetadata = JSON.parse(
    readFileSync("./corporation_search_api/index.json", "utf8")
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

loadAllCompanies().then(() => {
  let penalties = [];
  let violationCounts = [];
  let sumPenalties = 0;
  let sumViolationCounts = 0;
  let n = 0;
  for (const companyName of Object.keys(companyInfo.violations)) {
    const violations = companyInfo.violations[companyName];
    let totalPenalty = 0;
    for (const violation of violations) {
      const penalty = violation["Penalty Amount"];
      if (penalty) {
        totalPenalty += +penalty.slice(1).replace(/,/g, "");
      }
    }

    n += 1;

    penalties.push(totalPenalty);
    sumPenalties += totalPenalty;

    violationCounts.push(violations.length);
    sumViolationCounts += violations.length;
  }
  const meanTotalPenalty = sumPenalties / n;
  let stdTotalPenalty = 0;
  for (let penalty of penalties) {
    stdTotalPenalty +=
      (penalty - meanTotalPenalty) * (penalty - meanTotalPenalty);
  }
  stdTotalPenalty = Math.sqrt(stdTotalPenalty / n);

  let meanViolationCount = sumViolationCounts / violationCounts.length;
  let stdViolationCount = 0;
  for (let count of violationCounts) {
    stdViolationCount +=
      (count - meanViolationCount) * (count - meanViolationCount);
  }
  stdViolationCount = Math.sqrt(stdViolationCount / n);
  console.log(
    meanTotalPenalty,
    stdTotalPenalty,
    meanViolationCount,
    stdViolationCount
  );
  penalties.sort((a, b) => a - b);
  violationCounts.sort((a, b) => a - b);
  // Get median
  console.log(
    penalties[Math.floor(penalties.length / 2)],
    violationCounts[Math.floor(violationCounts.length / 2)]
  );
  console.log(violationCounts.slice(1717)); //violationCounts.length / 2);

  const exported = {
    penalties,
    violationCounts,
  };

  writeFileSync("./agg.json", JSON.stringify(exported));
});
