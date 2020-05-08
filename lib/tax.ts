import EU_COUNTRY_CODES from '../data/eu_country_codes';
import { TaxRates, TaxId, Tax } from './types';

export function getTaxExempt(country: string, taxNumber: string, taxOrigin: string): string {
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


export function getTaxId(country: string, taxNumber: string): TaxId {
  let tax_id = null;
  if (EU_COUNTRY_CODES.includes(country)) {
    if (taxNumber) {
      tax_id = { type: 'eu_vat', value: taxNumber };
    }
  }
  return tax_id;
}


export function getTaxRate(country: string, taxRates: TaxRates): string {
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

export function getTax(country: string, taxNumber: string, taxOrigin: string, taxRates: TaxRates): Tax {
  return {
    tax_exempt: getTaxExempt(country, taxNumber, taxOrigin),
    tax_id: getTaxId(country, taxNumber),
    tax_rate: getTaxRate(country, taxRates),
  };
}

export default {
  getTax,
  getTaxExempt,
  getTaxId,
  getTaxRate
};
