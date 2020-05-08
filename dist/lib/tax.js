"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const eu_country_codes_1 = __importDefault(require("../data/eu_country_codes"));
function getTaxExempt(country, taxNumber, taxOrigin) {
    let tax_exempt = null;
    if (eu_country_codes_1.default.includes(country)) {
        // Selling to an EU country
        if (country == taxOrigin) {
            tax_exempt = 'none';
        }
        else if (taxNumber) {
            tax_exempt = 'reverse';
        }
        else {
            tax_exempt = 'none';
        }
    }
    else if (country) {
        // Selling to a non-EU country
        tax_exempt = 'exempt';
    }
    return tax_exempt;
}
exports.getTaxExempt = getTaxExempt;
function getTaxId(country, taxNumber) {
    let tax_id = null;
    if (eu_country_codes_1.default.includes(country)) {
        if (taxNumber) {
            tax_id = { type: 'eu_vat', value: taxNumber };
        }
    }
    return tax_id;
}
exports.getTaxId = getTaxId;
function getTaxRate(country, taxRates) {
    let tax_rate = null;
    if (taxRates) {
        if (country in taxRates) {
            tax_rate = taxRates[country];
        }
        else if (taxRates.default) {
            tax_rate = taxRates.default;
        }
    }
    return tax_rate;
}
exports.getTaxRate = getTaxRate;
function getTax(country, taxNumber, taxOrigin, taxRates) {
    return {
        tax_exempt: getTaxExempt(country, taxNumber, taxOrigin),
        tax_id: getTaxId(country, taxNumber),
        tax_rate: getTaxRate(country, taxRates),
    };
}
exports.getTax = getTax;
exports.default = {
    getTax,
    getTaxExempt,
    getTaxId,
    getTaxRate
};
//# sourceMappingURL=tax.js.map