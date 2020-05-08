import { TaxRates, TaxId, Tax } from './types';
export declare function getTaxExempt(country: string, taxNumber: string, taxOrigin: string): string;
export declare function getTaxId(country: string, taxNumber: string): TaxId;
export declare function getTaxRate(country: string, taxRates: TaxRates): string;
export declare function getTax(country: string, taxNumber: string, taxOrigin: string, taxRates: TaxRates): Tax;
declare const _default: {
    getTax: typeof getTax;
    getTaxExempt: typeof getTaxExempt;
    getTaxId: typeof getTaxId;
    getTaxRate: typeof getTaxRate;
};
export default _default;
