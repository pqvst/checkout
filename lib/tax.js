const EU_COUNTRY_CODES = require('../data/eu_country_codes');


function getTaxExempt(country, taxNumber, taxOrigin) {
  let tax_exempt = null;
  if (EU_COUNTRY_CODES.includes(country)) {
    // Selling to an EU country
    if (country == taxOrigin) {
      tax_exempt = 'none';
    } else if (taxNumber) {
      tax_exempt = 'reverse';
    } else {
      tax_exempt = 'none';
    }
  } else if (country) {
    // Selling to a non-EU country
    tax_exempt = 'exempt';
  }
  return tax_exempt;
}


function getTaxId(country, taxNumber) {
  let tax_id = null;
  if (EU_COUNTRY_CODES.includes(country)) {
    if (taxNumber) {
      tax_id = { type: 'eu_vat', value: taxNumber };
    }
  }
  return tax_id;
}


function getTaxRate(country, taxRates) {
  let tax_rate = null;
  if (taxRates) {
    if (country in taxRates) {
      tax_rate = taxRates[country];
    } else if (taxRates.default) {
      tax_rate = taxRates.default;
    }
  }
  return tax_rate;
}


function getTax(country, taxNumber, taxOrigin, taxRates) {
  return {
    tax_exempt: getTaxExempt(country, taxNumber, taxOrigin),
    tax_id: getTaxId(country, taxNumber),
    tax_rate: getTaxRate(country, taxRates),
  };
}


module.exports = {
  getTax,
  getTaxExempt,
  getTaxId,
  getTaxRate
};
