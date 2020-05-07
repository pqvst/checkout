import { Stripe } from 'stripe';

interface TaxRateDefault {
  default: string;
}

export type TaxRates = TaxRateDefault & {[key: string]: string};

export interface TaxId {
  type: string;
  value: string;
}

export interface Tax {
  tax_exempt: string;
  tax_id: TaxId;
  tax_rate: string;
}

export interface ParsedCard {
  brand: string;
  month: number;
  year: number;
  last4: string;
  summary: string;
}

export interface ParsedCustomer{
  id: string;
  email: string;
  name: string;
  country: string;
  postcode: string;
  vat: string;
}
export interface ParsedPlan {
  id: string;
  name: string;
  metadata: Stripe.Metadata;
  amount: number;
  currency: string;
  interval: string;
}

export interface ParsedSubscription {
  valid: boolean;
  id?: string;
  cancelled?: boolean;
  card?: ParsedCard;
  plan?: ParsedPlan;
  customer?: ParsedCustomer;
  status?: string;
}

export interface ParsedReceipt {
  date: string;
  currency: string;
  amount: number;
  url: string;
}


export interface ManageSubscriptionOptions{
  /**
   * The plan ID
   */
  plan?: string;
  /**
   * The user's email
   */
  email?: string;
  /**
   * The user's name
   */
  name?: string;
  /**
   * The user's country
   */
  country?: string;
  postcode?: string;
  /**
   * Stripe payment method ID
   */
  paymentMethod?: string;
  /**
   * Stripe coupon ID
   */
  coupon?: string;
  /**
   * Number of days to trial. If the subscription exists, extends the trial from today by this many days.
   */
  trialDays?: number;
  /**
   * Stripe VAT ID
   */
  vat?: string;
  taxOrigin?: string;
  taxRates?: TaxRates;
}
