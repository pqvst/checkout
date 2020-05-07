import Stripe from 'stripe';
export default class Checkout {
    stripe: Stripe;
    constructor(stripe: Stripe);
    /**
       * Get setup intent client secret for payment method form.
       */
    getClientSecret(): Promise<string>;
}
