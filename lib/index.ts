// https://stripe.com/docs/billing/subscriptions/payment
// Test 3D Secure 2: 4000002500003155
// Test failure: 4000000000000341
// Test VAT number IE6388047V
import Debug from 'debug';
import Stripe from 'stripe';
import moment from 'moment';

const debug = Debug('checkout');
import CREDIT_CARD_BRAND_NAMES from '../data/credit_card_brands';
import validateVat from './validate-vat';
import { formatUnixDate } from './util';
import { getTax } from './tax';
import { ParsedCard, ParsedCustomer, ParsedPlan, ParsedReceipt, ParsedSubscription, ManageSubscriptionOptions } from './types';
export interface Checkout {
  getClientSecret: Function;
  getSubscription: Function;
  validateVatNumber: Function;
  manageSubscription: Function;
  cancelSubscription: Function;
  reactivateSubscription: Function;
  deleteSubscription: Function;
  deleteCustomer: Function;
  getReceipts: Function;
  validateCoupon: Function;
}

export default function (stripe: Stripe) {
  if (!stripe) {
    throw new Error('You must provide a stripe instance');
  }
  if (typeof stripe !== 'object') {
    throw new Error('You must provide a stripe instance (not an api key)');
  }

  function parseCard(card: Stripe.Card | Stripe.PaymentMethod.Card): ParsedCard {
    if (card) {
      const month = String(card.exp_month).padStart(2, '0');
      const year = String(card.exp_year).slice(2);
      const brand = CREDIT_CARD_BRAND_NAMES[card.brand] || card.brand;
      return {
        brand: card.brand,
        month: card.exp_month,
        year: card.exp_year,
        last4: card.last4,
        summary: `${brand} ending in ${card.last4} (${month}/${year})`
      };
    } else {
      return null;
    }
  }

  // Stripe maximum confusion with two different Card types.
  function getCard(customer: Stripe.Customer, sub: Stripe.Subscription): Stripe.PaymentMethod.Card | Stripe.Card {
    if (sub && sub.default_payment_method) {
      return (sub.default_payment_method as Stripe.PaymentMethod).card;
    } else if (customer) {
      if (customer.invoice_settings.default_payment_method) {
        return (customer.invoice_settings.default_payment_method as Stripe.PaymentMethod).card;
      } else {
        return (customer.sources.data[0] as Stripe.Card);
      }
    } else {
      return null;
    }
  }

  function parseCustomer(customer: Stripe.Customer): ParsedCustomer {
    if (customer) {
      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        country: customer.address ? customer.address.country : null,
        postcode: customer.address ? customer.address.postal_code : null,
        vat: customer.tax_ids.data.length > 0 ? customer.tax_ids.data[0].value : null,
      };
    }
    return null;
  }

  function parsePlan(sub: Stripe.Subscription): ParsedPlan {
    if (sub && sub.plan) {
      return {
        id: sub.plan.id,
        name: sub.plan.nickname,
        metadata: sub.plan.metadata,
        amount: sub.plan.amount,
        currency: sub.plan.currency,
        interval: sub.plan.interval,
      };
    }
    return null;
  }

  async function parseSubscription(customer: Stripe.Customer): Promise<ParsedSubscription> {
    const sub = customer ? customer.subscriptions.data[0] : null;

    const resp: ParsedSubscription = {
      id: null,
      valid: false,
      cancelled: false,
      card: parseCard(getCard(customer, sub)),
      plan: parsePlan(sub),
      customer: parseCustomer(customer),
    };

    if (!sub) {
      return resp;
    }

    // Defaults with a valid sub
    resp.id = sub.id;
    resp.valid = true;
    resp.cancelled = false;

    switch (sub.status) {

      case 'trialing': {
        resp.status = `Trialing until ${formatUnixDate(sub.trial_end)}`;
        return resp;
      }

      case 'active': {
        const periodEnd = formatUnixDate(sub.current_period_end);
        if (sub.cancel_at_period_end) {
          resp.cancelled = true;
          resp.status = `Cancels on ${periodEnd}`;
        } else {
          resp.status = `Renews on ${periodEnd}`;
        }
        return resp;
      }

      case 'incomplete':
      case 'past_due': {
        const invoice = await stripe.invoices.retrieve(sub.latest_invoice as string, {
          expand: ['payment_intent']
        });
        const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
        if (paymentIntent.last_payment_error) {
          resp.status = paymentIntent.last_payment_error.message;
        } else {
          switch (paymentIntent.status) {
            case 'requires_action': {
              resp.status = 'Invalid payment method (requires action)';
              break;
            }
            case 'requires_payment_method': {
              resp.status = 'Invalid payment method';
              break;
            }
            case 'requires_confirmation': {
              resp.status = 'Waiting for a new attempt';
              break;
            }
          }
        }
        resp.valid = false;
        return resp;
      }

      case 'incomplete_expired':
      case 'canceled':
      case 'unpaid':
        return { valid: false };

      default:
        console.log('unhandled status', sub.status);
        return { valid: false };
    }
  }


  /**
   * Get setup intent client secret for payment method form.
   */
  async function getClientSecret(): Promise<string> {
    debug('creating setup intent');
    const si = await stripe.setupIntents.create();
    return si.client_secret;
  }


  async function getSubscription(stripeCustomerId: string): Promise<ParsedSubscription> {
    if (stripeCustomerId) {
      debug('fetching subscriptions');
      const customer = (await stripe.customers.retrieve(stripeCustomerId, { expand: ['invoice_settings.default_payment_method', 'subscriptions.data.default_payment_method'] })) as Stripe.Customer;
      return await parseSubscription(customer);
    } else {
      debug('no customer id');
      return await parseSubscription(null);
    }
  }


  async function validateVatNumber(q: string): Promise<boolean> {
    const country = q.slice(0, 2);
    const number = q.slice(2);
    return await validateVat(country, number);
  }

  async function manageSubscription(stripeCustomerId: string, opts: ManageSubscriptionOptions = {}): Promise<string> {
    const { plan, email, name, country, postcode, paymentMethod, coupon, trialDays, vat, taxOrigin, taxRates } = opts;

    // Maybe validate coupon
    if (coupon) {
      debug('validating coupon:', coupon);
      try {
        await stripe.coupons.retrieve(coupon);
      } catch (err) {
        throw new Error('Coupon not found');
      }
    }

    // Maybe validate vat number
    if (vat) {
      if (!await validateVatNumber(vat)) {
        throw new Error('Invalid vat number');
      }
    }

    const { tax_exempt, tax_id, tax_rate } = getTax(country, vat, taxOrigin, taxRates);
    debug('tax status: tax_exempt=' + tax_exempt);

    let customer: Stripe.Customer;

    // Retrieve customer
    if (stripeCustomerId) {
      debug('updating existing customer');
      try {
        customer = (await stripe.customers.retrieve(stripeCustomerId)) as Stripe.Customer;
        await stripe.customers.update(stripeCustomerId, { name, email, tax_exempt: (tax_exempt as Stripe.Customer.TaxExempt), address: { line1: '', country, postal_code: postcode } });
      } catch (err) {
        stripeCustomerId = null;
      }
    }

    // Create customer
    if (!stripeCustomerId) {
      debug('creating new customer');
      customer = await stripe.customers.create({ name, email, tax_exempt: (tax_exempt as Stripe.Customer.TaxExempt), address: { line1: '', country, postal_code: postcode } });
      stripeCustomerId = customer.id;
    }

    // Maybe update tax id
    if (tax_id) {
      if (!customer.tax_ids.data.find(e => e.type == tax_id.type && e.value == tax_id.value)) {
        debug('adding tax id: ' + tax_id.type + ' ' + tax_id.value);
        await stripe.customers.createTaxId(stripeCustomerId, tax_id as Stripe.TaxIdCreateParams);
      } else {
        debug('tax id already exists');
      }
    } else {
      debug('removing tax id');
      for (const e of customer.tax_ids.data) {
        await stripe.customers.deleteTaxId(stripeCustomerId, e.id);
      }
    }

    // Maybe apply tax rates
    const default_tax_rates = [];
    if (tax_rate) {
      debug('adding tax rate: ' + tax_rate);
      default_tax_rates.push(tax_rate);
    }

    // Maybe attach a payment method (e.g. new subscription or change card) and set is as the default payment method for the customer
    if (paymentMethod) {
      const oldPaymentMethod = customer.invoice_settings ? customer.invoice_settings.default_payment_method : null;
      debug('attaching payment method');
      await stripe.paymentMethods.attach(paymentMethod, { customer: stripeCustomerId }); // add new card
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethod
        }
      });
      if (oldPaymentMethod) {
        debug('detach old payment method');
        await stripe.paymentMethods.detach(oldPaymentMethod as string);
      }
    }

    // Fetch subscription for customer
    if (customer.subscriptions.data.length > 0) {
      const sub = customer.subscriptions.data[0];
      debug('found subscription with status=' + sub.status);

      // Maybe change plan
      if (plan) {
        if (sub.plan.id !== plan) {
          debug('update subscription plan:', plan);
          let trial_end;
          if (trialDays) {

            trial_end = moment().add(trialDays, 'days').valueOf();
          }
          await stripe.subscriptions.update(sub.id, {
            default_tax_rates,
            coupon: coupon || undefined,
            trial_end,
            billing_cycle_anchor: 'now',
            items: [{ id: sub.items.data[0].id, plan }],
            off_session: true,
          });
        } else {
          debug('customer is already subscribed to plan:', plan);
        }
      }

      if (sub.status == 'incomplete') {
        const invoice = await stripe.invoices.retrieve(sub.latest_invoice as string, { expand: ['payment_intent'] });
        const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
        if (paymentIntent.status == 'requires_payment_method' || paymentIntent.status == 'requires_confirmation') {
          try {
            debug('attempting invoice again...');
            await stripe.invoices.pay(invoice.id);
          } catch (err) {
            debug('new attempt failed...', err.message);
          }
        }
      }

      if (sub.status == 'past_due') {
        debug('attempt to pay latest invoice');
        await stripe.invoices.pay(sub.latest_invoice as string);
      }

    } else if (plan) { // allow creating a subscription with an existing default payment method!
      debug('creating new subscription');
      const sub = await stripe.subscriptions.create({
        default_tax_rates,
        coupon: coupon || undefined,
        trial_period_days: trialDays || undefined,
        customer: stripeCustomerId,
        items: [{ plan }],
        off_session: true,
      });
      if (sub.status === 'incomplete') {
        debug('failed to create new sub:', sub.status);
      // await stripe.subscriptions.del(sub.id); ???
      }
    }

    return stripeCustomerId;
  }


  /**
   * Cancel a subscription (default at period end).
   */
  async function cancelSubscription(stripeCustomerId: string, atPeriodEnd = true): Promise<Stripe.Subscription> {
    const sub = await getSubscription(stripeCustomerId);
    if (sub.valid) {
      debug('canceling subscription atPeriodEnd=' + atPeriodEnd);
      const canceledSubscription = await stripe.subscriptions.update(sub.id, {
        cancel_at_period_end: atPeriodEnd
      });
      return canceledSubscription;
    } else {
      debug('no subscription to cancel');
      return null;
    }
  }


  /**
   * Reactivate a subscription that has been cancelled (if at period end).
   */
  async function reactivateSubscription(stripeCustomerId: string): Promise<boolean> {
    const sub = await getSubscription(stripeCustomerId);
    if (sub.valid) {
      debug('reactivating subscription');
      await stripe.subscriptions.update(sub.id, { cancel_at_period_end: false });
      return true;
    } else {
      debug('no subscription to reactivate');
      return false;
    }
  }


  /**
   * Delete a subscription immediately (e.g. when closing an account).
   */
  async function deleteSubscription(stripeCustomerId: string): Promise<boolean> {
    const sub = await getSubscription(stripeCustomerId);
    if (sub.valid) {
      debug('deleting subscription');
      await stripe.subscriptions.del(sub.id);
      return true;
    } else {
      debug('no subscription to delete');
      return false;
    }
  }


  /**
   * Delete a subscription immediately (e.g. when closing an account).
   */
  async function deleteCustomer(stripeCustomerId: string): Promise<boolean> {
    if (stripeCustomerId) {
      await stripe.customers.del(stripeCustomerId);
      return true;
    } else {
      debug('no customer id');
      return false;
    }
  }


  /**
   * List all receipts
   */
  async function getReceipts(stripeCustomerId: string): Promise<ParsedReceipt[]> {
    if (!stripeCustomerId) {
      debug('no customer id');
      return [];
    }
    debug('fetching receipts');
    const receipts = await stripe.invoices.list({ customer: stripeCustomerId, status: 'paid', limit: 10 });
    return receipts.data.map(e => {
      return {
        date: formatUnixDate(e.created),
        currency: e.currency,
        amount: e.total,
        url: e.invoice_pdf,
      };
    });
  }

  /**
   * Validate coupon
   */
  async function validateCoupon(couponCode: string): Promise<boolean> {
    try {
      const coupon = await stripe.coupons.retrieve(couponCode);
      return coupon.valid === true;
    } catch (err) {
      return false;
    }
  }


  return {
    getClientSecret,
    getSubscription,
    validateVatNumber,
    manageSubscription,
    cancelSubscription,
    reactivateSubscription,
    deleteSubscription,
    deleteCustomer,
    getReceipts,
    validateCoupon,
  };
}
