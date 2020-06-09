import { expect } from 'chai';
import Checkout from '../lib/checkout';
import Stripe from 'stripe';

const stripe = {} as Stripe; // mock
const checkout = new Checkout(stripe);

/*
  default_payment_method: {
    brand: 'visa',
    exp_month: 1,
    exp_year: 2020,
    last4: 4242,
  } as unknown as Stripe.PaymentMethod
*/

const customer = {
  id: 'customerid',
  email: 'foo@bar.com',
  name: 'Foo Bar',
  invoice_settings: {
    default_payment_method: null,
  },
  sources: {
    data: []
  },
  tax_ids: {
    data: []
  },
  subscriptions: {
    data: []
  },
} as Stripe.Customer;

describe('checkout', function () {

  describe('.parseSubscription', function () {

    it('customer', async function () {
      const sub = await checkout.parseSubscription(customer);
      expect(sub).to.deep.equal({
        id: null,
        valid: false,
        cancelled: false,
        periodEnd: null,
        card: null,
        plan: null,
        customer: {
          id: 'customerid',
          email: 'foo@bar.com',
          name: 'Foo Bar',
          country: null,
          postcode: null,
          vat: null
        }
      });
    });

    it('customer with address', async function () {
      const customerWithAddress = Object.assign({}, customer, {
        address: {
          country: 'SE',
          postal_code: '12345'
        }
      });
      const sub = await checkout.parseSubscription(customerWithAddress);
      expect(sub.customer.country).to.equal('SE');
      expect(sub.customer.postcode).to.equal('12345');
    });

    it('customer with tax id', async function () {
      const customerWithTaxId = Object.assign({}, customer, {
        tax_ids: {
          data: [
            { value: 'SE1234567890' }
          ]
        }
      });
      const sub = await checkout.parseSubscription(customerWithTaxId);
      expect(sub.customer.vat).to.equal('SE1234567890');
    });

    it('customer with default payment method', async function () {
      const customerWithDefaultPaymentMethod = Object.assign({}, customer, {
        invoice_settings: {
          default_payment_method: {
            card: {
              brand: 'visa',
              exp_month: 1,
              exp_year: 2020,
              last4: 4242,
            }
          }
        }
      });
      const sub = await checkout.parseSubscription(customerWithDefaultPaymentMethod);
      expect(sub.card).to.not.equal(null);
    });

    it('customer with subscription', async function () {
      // TODO
    });
    
    //--------------------------------------------------------------------------------
    // Main sub statuses
    //--------------------------------------------------------------------------------

    it('active subscription', async function () {
      const customerWithActiveSubscription = Object.assign({}, customer, {
        subscriptions: {
          data: [{
            status: 'active',
            current_period_end: 1000000,
            cancelled: false,
            cancel_at_period_end: false,
          }]
        }
      });
      const sub = await checkout.parseSubscription(customerWithActiveSubscription);
      expect(sub.status).to.equal('Renews on Jan 12, 1970');
      expect(sub.valid).to.equal(true);
      expect(sub.cancelled).to.equal(false);
      expect(sub.periodEnd).to.equal(1000000);
    });

    it('trialing subscription', async function () {
      const customerWithTrialingSubscription = Object.assign({}, customer, {
        subscriptions: {
          data: [{
            status: 'trialing',
            trial_end: 1000000,
            cancel_at_period_end: false,
            cancelled: false,
          }]
        }
      });
      const sub = await checkout.parseSubscription(customerWithTrialingSubscription);
      expect(sub.status).to.equal('Trial ends Jan 12, 1970');
      expect(sub.valid).to.equal(true);
      expect(sub.cancelled).to.equal(false);
    });

    it('incomplete subscription', async function () {
      // TODO
    });

    it('past_due subscription', async function () {
      // TODO
    });

    //--------------------------------------------------------------------------------
    // Main sub statuses + cancel_at_period_end
    //--------------------------------------------------------------------------------

    it('cancel_at_period_end + active subscription', async function () {
      const customerWithActiveCancellingSubscription = Object.assign({}, customer, {
        subscriptions: {
          data: [{
            status: 'active',
            current_period_end: 1000000,
            cancel_at_period_end: true,
            cancelled: false,
          }]
        }
      });
      const sub = await checkout.parseSubscription(customerWithActiveCancellingSubscription);
      expect(sub.status).to.equal('Cancels on Jan 12, 1970');
      expect(sub.valid).to.equal(true);
      expect(sub.cancelled).to.equal(true);
    });

    it('cancel_at_period_end + trialing subscription', async function () {
      const customerWithTrialingCancellingSubscription = Object.assign({}, customer, {
        subscriptions: {
          data: [{
            status: 'trialing',
            current_period_end: 1000000,
            cancel_at_period_end: true,
            cancelled: false,
          }]
        }
      });
      const sub = await checkout.parseSubscription(customerWithTrialingCancellingSubscription);
      expect(sub.status).to.equal('Cancels on Jan 12, 1970');
      expect(sub.valid).to.equal(true);
      expect(sub.cancelled).to.equal(true);
    });

    it('cancel_at_period_end + incomplete subscription', async function () {
      const customerWithIncompleteCancellingSubscription = Object.assign({}, customer, {
        subscriptions: {
          data: [{
            status: 'incomplete',
            current_period_end: 1000000,
            cancel_at_period_end: true,
            cancelled: false,
          }]
        }
      });
      const sub = await checkout.parseSubscription(customerWithIncompleteCancellingSubscription);
      expect(sub.status).to.equal('Cancels on Jan 12, 1970');
      expect(sub.valid).to.equal(false);
      expect(sub.cancelled).to.equal(true);
    });

    it('cancel_at_period_end + past_due subscription', async function () {
      const customerWithPastDueCancellingSubscription = Object.assign({}, customer, {
        subscriptions: {
          data: [{
            status: 'past_due',
            current_period_end: 1000000,
            cancel_at_period_end: true,
            cancelled: false,
          }]
        }
      });
      const sub = await checkout.parseSubscription(customerWithPastDueCancellingSubscription);
      expect(sub.status).to.equal('Cancels on Jan 12, 1970');
      expect(sub.valid).to.equal(false);
      expect(sub.cancelled).to.equal(true);
    });

  });

});
