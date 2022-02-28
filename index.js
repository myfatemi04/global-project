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

app.get("/company_info", (req, res) => {
  const name = req.query.company;
  if (name === null) {
    res.json({ status: "not_found" });
    return;
  }
  const results = [];
  for (const company of companies) {
    if (company.name.toLowerCase().includes(name)) {
      results.push(company);
    }
  }
  if (results.length === 0) {
    res.json({ status: "not_found" });
    return;
  }
  res.json({ status: "found", companies: results });
  return;
});

app.listen(80, () => console.log("Listening"));
