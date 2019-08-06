const STRIPE_SECRET_KEY = '...';
const STRIPE_PUBLIC_KEY = '...';
const PREMIUM_PLAN_ID = '...';
const PORT = 3000;


const checkout = require('../lib')(STRIPE_SECRET_KEY);
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');


// Setup express
const app = express();
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.set('views', __dirname);
app.set('view engine', 'pug');
app.use('/js/checkout.js', express.static(path.join(__dirname, '../dist/checkout.js')));


// Implement endpoint for VAT number validation
app.get('/validateVatNumber', (req, res) => {
  checkout.validateVatNumber(req.query.q).then(valid => {
    res.status(valid ? 200 : 400).json({ valid });
  });
});


// Implement endpoint for coupon validation
app.get('/validateCoupon', (req, res) => {
  checkout.validateCoupon(req.query.q).then(valid => {
    res.status(valid ? 200 : 400).json({ valid });
  });
});


// Landing page showing current subscription status and receipts.
app.get('/', async (req, res) => {
  res.render('index', {
    customer: req.query.customer || '',
    sub: await checkout.getSubscription(req.query.customer),
    receipts: await checkout.getReceipts(req.query.customer),
  });
});


// Update payment information for an existing subscription
app.get('/card', async (req, res) => {
  const sub = await checkout.getSubscription(req.query.customer);
  res.render('checkout', {
    checkout: {
      stripePublicKey: STRIPE_PUBLIC_KEY,
      clientSecret: await checkout.getClientSecret(),
      header: '',
      title: 'Update card details',
      action: 'Save',
      prefill: sub,
    }
  });
});

app.post('/card', async (req, res) => {
  await checkout.manageSubscription(req.query.customer, {
    email: req.body.email,
    name: req.body.name,
    country: req.body.country,
    postcode: req.body.postcode,
    vat: req.body.vat,
    paymentMethod: req.body.paymentMethod,
  });
  res.redirect('/?customer=' + req.query.customer);
});


// Upgrade subscription for new customers
app.get('/upgrade', async (req, res) => {
  const sub = await checkout.getSubscription(req.query.customer);
  res.render('checkout', {
    checkout: {
      stripePublicKey: STRIPE_PUBLIC_KEY,
      clientSecret: await checkout.getClientSecret(),
      header: 'Upgrade to Gold',
      title: '$10.00 per month',
      action: 'Upgrade',
      prefill: sub,
      coupon: true,
      couponValidationUrl: '/validateCoupon',
    }
  });
});

app.post('/upgrade', async (req, res) => {
  const stripeCustomerId = await checkout.manageSubscription(req.query.customer, {
    plan: PREMIUM_PLAN_ID,
    email: req.body.email,
    name: req.body.name,
    country: req.body.country,
    postcode: req.body.postcode,
    vat: req.body.vat,
    coupon: req.body.coupon,
    paymentMethod: req.body.paymentMethod,
  });
  res.redirect('/?customer=' + stripeCustomerId);
});


app.get('/cancel', async (req, res) => {
  await checkout.cancelSubscription(req.query.customer);
  res.redirect('/?customer=' + req.query.customer);
});


app.get('/reactivate', async (req, res) => {
  await checkout.reactivateSubscription(req.query.customer);
  res.redirect('/?customer=' + req.query.customer);
});


app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));
