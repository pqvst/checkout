import Stripe from 'stripe';
import Checkout from './checkout';

export = function (stripe: Stripe): Checkout {
  return new Checkout(stripe);
}
