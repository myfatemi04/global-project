// main file

const companies = [
  {
    name: "nestle",
    rating: 0,
  },
  {
    name: "amazon",
    rating: -10,
  },
];

const express = require("express");

const app = express();

app.set("view engine", "hbs");

function getMatchingCompanies(name) {
  const results = [];
  for (const company of companies) {
    if (company.name.toLowerCase().includes(name)) {
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
  const companies = getMatchingCompanies(req.query.company);
  if (companies.length === 0) {
    res.status(404);
    res.render("not_found");
    res.end();
    return;
  }
  const company = companies[0];
  res.render("company_info", { name: company.name, rating: company.rating });
  return;
});

app.listen(80, () => console.log("Listening"));
