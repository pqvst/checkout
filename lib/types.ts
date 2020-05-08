
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

export interface Card {
  brand: string;
  month: number;
  year: number;
  last4: string;
  summary: string;
}

export interface Customer {
  id: string;
  email: string;
  name: string;
  country: string;
  postcode: string;
  vat: string;
}

export interface Metadata {
  [name: string]: string;
}

export interface Plan {
  id: string;
  name: string;
  metadata: Metadata;
  amount: number;
  currency: string;
  interval: string;
}

export interface Subscription {
  valid: boolean;
  id?: string;
  cancelled?: boolean;
  periodEnd?: number;
  card?: Card;
  plan?: Plan;
  customer?: Customer;
  status?: string;
}

export interface Receipt {
  date: string;
  currency: string;
  amount: number;
  url: string;
}


export interface ManageSubscriptionOptions {
  /**
   * Stripe plan ID
   */
  plan?: string;
  /**
   * Customer email
   */
  email?: string;
  /**
   * Customer name
   */
  name?: string;
  /**
   * Customer country
   */
  country?: string;
  /**
   * Customer postcode
   */
  postcode?: string;
  /**
   * New Stripe payment method ID
   */
  paymentMethod?: string;
  /**
   * Stripe coupon ID
   */
  coupon?: string;
  /**
   * Number of days to trial (only applicable for new subscriptions)
   */
  trialDays?: number;
  /**
   * Stripe tax ID
   */
  vat?: string;
  taxOrigin?: string;
  taxRates?: TaxRates;
}
