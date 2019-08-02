// https://stripe.com/docs/billing/subscriptions/payment
// Test 3D Secure 2: 4000002500003155
// Test failure: 4000000000000341
const EU_COUNTRY_CODES = require('../data/eu_country_codes');
const MONTH_NAMES = require('../data/month_names');
const CREDIT_CARD_BRAND_NAMES = require('../data/credit_card_brands');


module.exports = function (stripeSecretKey) {
  if (!stripeSecretKey) {
    throw new Error('You must provide a stripe secret key');
  }
  
  const debug = require('debug')('checkout');
  const validateVat = require('./validate-vat');
  const stripe = require('stripe')(stripeSecretKey);

  function trace() {
    debug(...arguments);
  }


  function parseCard(card) {
    if (!card) {
      return { summary: 'No Card' };
    }
    const month = String(card.exp_month).padStart(2, '0');
    const year = String(card.exp_year).slice(2);
    const brand = CREDIT_CARD_BRAND_NAMES[card.brand] || card.brand;
    return {
      brand: card.brand,
      exp_month: card.exp_month,
      exp_year: card.exp_year,
      last4: card.last4,
      summary: `${brand} ending in ${card.last4} (${month}/${year})`
    };
  }

  function getCard(customer, sub) {
    if (sub.default_payment_method) {
      return sub.default_payment_method.card;
    } else {
      if (customer.invoice_settings.default_payment_method) {
        return customer.invoice_settings.default_payment_method.card;
      } else {
        return customer.sources.data[0];
      }
    }
  }

  function formatUnixDate(unix) {
    const date = new Date(unix*1000);
    const month = MONTH_NAMES[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  }

  async function parseSubscription(customer) {
    const sub = customer.subscriptions.data[0];

    const card = getCard(customer, sub);
    
    const resp = {
      id: sub.id,
      valid: true,
      cancelled: false,
      card: parseCard(card),
      plan: {
        id: sub.plan.id,
        name: sub.plan.nickname,
        metadata: sub.plan.metadata,
        amount: sub.plan.amount,
        currency: sub.plan.currency,
        interval: sub.plan.interval,
      },
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        country: customer.metadata.country,
        vat: customer.tax_ids.data.length > 0 ? customer.tax_ids.data[0].value : null,
      }
    };

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

      case 'incomplete': {
        const invoice = await stripe.invoices.retrieve(sub.latest_invoice, {
          expand: ['payment_intent']
        });
        switch (invoice.payment_intent.status) {
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
        resp.valid = false;
        return resp;
      }

      case 'past_due': {
        resp.status = `Past Due`;
        resp.valid = false;
        return resp;
      }

      case 'incomplete_expired':
      case 'canceled':
      case 'unpaid':
        return null;
        
      default:
        console.log('unhandled status', sub.status);
        return null;
    }
  }


  /**
   * Get setup intent client secret for payment method form.
   */
  async function getClientSecret() {
    trace('creating setup intent');
    const si = await stripe.setupIntents.create();
    return si.client_secret;
  }


  async function getSubscription(stripeCustomerId) {
    if (stripeCustomerId) {
      trace('fetching subscriptions');
      const customer = await stripe.customers.retrieve(stripeCustomerId, { expand: ['invoice_settings.default_payment_method'] });
      if (customer.subscriptions.data.length > 0) {
        return await parseSubscription(customer);
      } else {
        trace('no active subscription');
      }
    } else {
      trace('no customer id');
    }
    return null;
  }


  async function validateVatNumber(q) {
    const country = q.slice(0, 2);
    const number = q.slice(2);
    return await validateVat(country, number);
  }


  async function getTax(country, vat) {
    let tax_exempt, tax_id;
    if (EU_COUNTRY_CODES.includes(country)) {
      if (vat && await validateVatNumber(vat)) {
        tax_exempt = 'reverse';
        tax_id = { type: 'eu_vat', value: vat };
      } else {
        tax_exempt = 'none';
      }
    } else {
      tax_exempt = 'exempt';
    }
    return { tax_exempt, tax_id };
  }


  async function manageSubscription(stripeCustomerId, opts = {}) {
    const { plan, email, name, country, payment_method, coupon, trial_period_days, vat, tax_rate } = opts;

    // Maybe validate coupon
    if (coupon) {
      trace('validating coupon:', coupon);
      try {
        await stripe.coupons.retrieve(coupon);
      } catch (err) {
        throw new Error('Coupon not found');
      }
    }

    let { tax_exempt, tax_id } = await getTax(country, vat);
    trace('tax status: tax_exempt=' + tax_exempt);

    let customer;

    // Retrieve customer
    if (stripeCustomerId) {
      trace('updating existing customer');
      try {
        customer = await stripe.customers.retrieve(stripeCustomerId);
        await stripe.customers.update(stripeCustomerId, { name, email, tax_exempt, metadata: { country } });
      } catch (err) {
        stripeCustomerId = null;
      }
    }
    
    // Create customer
    if (!stripeCustomerId) {
      trace('creating new customer');
      customer = await stripe.customers.create({ name, email, tax_exempt, metadata: { country } });
      stripeCustomerId = customer.id;
    }

    // Maybe update tax id
    if (tax_id) {
      if (!customer.tax_ids.data.find(e => e.type == tax_id.type && e.value == tax_id.value)) {
        trace('adding tax id: ' + tax_id.type + ' ' + tax_id.value);
        await stripe.customers.createTaxId(stripeCustomerId, tax_id);
      } else {
        trace('tax id already exists');
      }
    } else {
      trace('removing tax id');
      for (let e of customer.tax_ids.data) {
        await stripe.customers.deleteTaxId(stripeCustomerId, e.id);
      }
    }

    // Maybe apply tax rates
    const default_tax_rates = [];
    if (tax_rate) {
      trace('adding tax rate: ' + tax_rate);
      default_tax_rates.push(tax_rate);
    }

    // Maybe attach a payment method (e.g. new subscription or change card) and set is as the default payment method for the customer
    if (payment_method) {
      trace('attaching payment method');
      const oldPaymentMethod = customer.invoice_settings.default_payment_method;
      await stripe.paymentMethods.attach(payment_method, { customer: stripeCustomerId }); // add new card
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: payment_method
        }
      });
      /*
      if (sub.default_payment_method) {
        await stripe.paymentMethods.detach(sub.default_payment_method);
      }
      */
      if (customer.sources.data[0]) {
        await stripe.paymentMethods.detach(customer.sources.data[0].id); // remove old source
      }
      if (oldPaymentMethod) {
        await stripe.paymentMethods.detach(oldPaymentMethod); // remove old card
      }
    }

    // Fetch subscription for customer
    if (customer.subscriptions.data.length > 0) {
      const sub = customer.subscriptions.data[0];
      trace('found subscription with status=' + sub.status);

      // Maybe change plan
      if (plan) {
        trace('update subscription plan:', plan);
        await stripe.subscriptions.update(sub.id, {
          default_tax_rates,
          coupon,
          trial_period_days,
          billing_cycle_anchor: 'now',
          items: [{ id: sub.items.data[0].id, plan }],
        });
      }
      
      if (sub.status == 'incomplete') {
        const invoice = await stripe.invoices.retrieve(sub.latest_invoice, { expand: ['payment_intent'] });
        if (invoice.payment_intent.status == 'requires_payment_method' || invoice.payment_intent.status == 'requires_confirmation') {
          try {
            trace('attempting invoice again...');
            await stripe.invoices.pay(invoice.id);
          } catch (err) {
            trace('new attempt failed...', err.message);
          }
        }
      }

    } else if (plan && payment_method) {
      trace('creating new subscription');
      const sub = await stripe.subscriptions.create({
        default_tax_rates,
        coupon,
        trial_period_days,
        customer: stripeCustomerId,
        items: [{ plan }],
      });
      if (sub.status === 'incomplete') {
        trace('failed to create new sub:', sub.status);
        // await stripe.subscriptions.del(sub.id); ???
      }
    }

    return stripeCustomerId;
  }


  /**
   * Cancel a subscription (default at period end).
   */
  async function cancelSubscription(stripeCustomerId, atPeriodEnd = true) {
    const sub = await getSubscription(stripeCustomerId);
    if (sub) {
      trace('canceling subscription atPeriodEnd=' + atPeriodEnd);
      await stripe.subscriptions.update(sub.id, {
        cancel_at_period_end: atPeriodEnd
      });
      return true;
    } else {
      trace('no subscription to cancel');
      return false;
    }
  }


  /**
   * Reactivate a subscription that has been cancelled (if at period end).
   */
  async function reactivateSubscription(stripeCustomerId) {
    const sub = await getSubscription(stripeCustomerId);
    if (sub) {
      trace('reactivating subscription');
      await stripe.subscriptions.update(sub.id, { cancel_at_period_end: false });
      return true;
    } else {
      trace('no subscription to reactivate');
      return false;
    }
  }


  /**
   * Delete a subscription immediately (e.g. when closing an account).
   */
  async function deleteSubscription(stripeCustomerId) {
    const sub = await getSubscription(stripeCustomerId);
    if (sub) {
      trace('deleting subscription');
      await stripe.subscriptions.del(sub.id);
      return true;
    } else {
      trace('no subscription to delete');
      return false;
    }
  }


  /**
   * Delete a subscription immediately (e.g. when closing an account).
   */
  async function deleteCustomer(stripeCustomerId) {
    await stripe.customers.del(stripeCustomerId);
  }


  /**
   * List all receipts
   */
  async function getReceipts(stripeCustomerId) {
    if (!stripeCustomerId) {
      trace('no customer id');
      return [];
    }
    trace('fetching receipts');
    const receipts = await stripe.invoices.list({ customer: stripeCustomerId, status: 'paid' });
    return receipts.data.map(e => {
      return {
        date: formatUnixDate(e.created),
        currency: e.currency,
        amount: e.total,
        url: e.invoice_pdf,
      };
    });
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
  }
}
