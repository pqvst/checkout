import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import Stripe from 'stripe';
import dotenv from 'dotenv';

import Checkout from '../lib';

dotenv.config({ path: path.join(__dirname, '.env') });

const STRIPE_PUBLIC_KEY = process.env.STRIPE_PUBLIC_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const PLAN_ID = process.env.PLAN_ID;
const PORT = process.env.PORT || 3000;


if (!STRIPE_PUBLIC_KEY || !STRIPE_SECRET_KEY) {
  throw new Error('You must add your stripe public and secret key.');
}
if (!PLAN_ID) {
  throw new Error('You must define a plan id for testing purposes.');
}


const checkout = Checkout(new Stripe(STRIPE_SECRET_KEY, null));

// Setup express
const app = express();
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.set('views', __dirname);
app.set('view engine', 'pug');
app.use('/js/checkout.js', express.static(path.join(__dirname, '../dist/client/checkout.js')));


// Implement endpoint for VAT number validation
app.get('/validateVatNumber', (req, res) => {
  checkout.validateVatNumber(req.query.q as string).then(valid => {
    res.status(valid ? 200 : 400).json({ valid });
  });
});


// Implement endpoint for coupon validation
app.get('/validateCoupon', (req, res) => {
  checkout.validateCoupon(req.query.q as string).then(valid => {
    res.status(valid ? 200 : 400).json({ valid });
  });
});


// Landing page showing current subscription status and receipts.
app.get('/', async (req, res) => {
  res.render('index', {
    customer: req.query.customer || '',
    sub: await checkout.getSubscription(req.query.customer as string),
    receipts: await checkout.getReceipts(req.query.customer as string),
  });
});


// Update payment information for an existing subscription
app.get('/card', async (req, res) => {
  const sub = await checkout.getSubscription(req.query.customer as string);
  res.render('checkout', {
    checkout: {
      stripePublicKey: STRIPE_PUBLIC_KEY,
      clientSecret: await checkout.getClientSecret(),
      titleText: 'Update card details',
      actionText: 'Save',
      prefill: sub,
    }
  });
});

app.post('/card', async (req, res) => {
  try {
    await checkout.manageSubscription(req.query.customer as string, {
      email: req.body.email,
      name: req.body.name,
      country: req.body.country,
      postcode: req.body.postcode,
      vat: req.body.vat,
      paymentMethod: req.body.paymentMethod,
    });
    res.redirect('/?customer=' + req.query.customer);
  } catch (err) {
    res.json({ error: err.message });
  }
});


// Upgrade subscription for new customers
app.get('/upgrade', async (req, res) => {
  const sub = await checkout.getSubscription(req.query.customer as string);
  res.render('checkout', {
    checkout: {
      stripePublicKey: STRIPE_PUBLIC_KEY,
      clientSecret: await checkout.getClientSecret(),
      headerText: 'Upgrade to Gold',
      titleText: '$10.00 per month',
      showCoupon: true,
      actionText: 'Upgrade',
      couponValidationUrl: '/validateCoupon',
      prefill: sub,
    }
  });
});

app.post('/upgrade', async (req, res) => {
  try {
    const stripeCustomerId = await checkout.manageSubscription(req.query.customer as string, {
      plan: PLAN_ID,
      email: req.body.email,
      name: req.body.name,
      country: req.body.country,
      postcode: req.body.postcode,
      vat: req.body.vat,
      coupon: req.body.coupon,
      paymentMethod: req.body.paymentMethod,
    });
    res.redirect('/?customer=' + stripeCustomerId);
  } catch (err) {
    res.json({ error: err.message });
  }
});


app.get('/cancel', async (req, res) => {
  await checkout.cancelSubscription(req.query.customer as string);
  res.redirect('/?customer=' + req.query.customer);
});


app.get('/reactivate', async (req, res) => {
  await checkout.reactivateSubscription(req.query.customer as string);
  res.redirect('/?customer=' + req.query.customer);
});


app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));
