# Checkout
A simple, open-source, lightweight, checkout page for [Stripe](https://stripe.com) SaaS subscriptions featuring:
- Client-side payment form
- Server-side subscription management
- EU VAT validation
- Tax rates
- Coupon codes
- SCA compliant with 3D Secure 2 authentication
- Single subscriptions per customer
- Single payment methods per customer
- Re-use existing saved card details

## Quick Start

```
npm install --save pqvst/checkout#2.0.0
```

#### app.js

```js
const stripe = require('stripe')(STRIPE_SECRET_KEY);

// Initialize server-side library with your stripe instance
const checkout = require('checkout')(stripe);

// Serve the client-side library
app.use('/js/checkout.js', express.static('./node_modules/checkout/dist/client/checkout.js'));

// Render the payment form and pass options
app.get('/upgrade', async (req, res) => {
  res.render('checkout', {
    checkout: {
      stripePublicKey: STRIPE_PUBLIC_KEY,
      clientSecret: await checkout.getClientSecret(),
    }
  });
});

// Create or update the user's subscription
app.post('/upgrade', async (req, res) => {
  const user = req.user;
  user.stripeCustomerId = await checkout.manageSubscription(user.stripeCustomerId, {
    plan: '<plan_id>',
    email: req.body.email,
    name: req.body.name,
    paymentMethod: req.body.paymentMethod,
  });
  await user.save();
  res.redirect('/');
});
```

#### checkout.html

```html
<html>

<head>
  <title>Payment Details</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://js.stripe.com/v3/"></script>
  <script src="/js/checkout.js"></script>
</head>

<body>
  <div id="checkout"></div>
  <script>
    Checkout({
      stripePublicKey: '{{stripePublicKey}}',
      clientSecret: '{{clientSecret}}',
    });
  </script>
</body>

</html>
```

#### Screenshot

![](screenshot.png)



## Client-Side API
Initialize the client-side with one line of code to automatically create a complete payment form. Many configuration options and customization points are available.

```js
Checkout({
  stripePublicKey: '...',
  clientSecret: '...',
  ...
});
```

### Options

Name | Type | Description
--|--|--
element | string | Selector to the element where the form will be mounted (default `'#checkout'`)
stripePublicKey | string | Your account Stripe public key **(required)**
clientSecret | string | Client secret generated using the server-side API helper `checkout.getClientSecret()` **(required)**
formAction | string | Override form action (POST endpoint)
userData | string | Custom user data that will be POSTed back to the server
themeColor | string | Custom color for buttons and links
headerText | string | Custom header text shown above title
titleText | string | Custom title text shown (default: `'Payment Information'`)
actionText | string | Button text (default: `'Continue'`)
errorText | string | Display a custom error message (e.g. backend error message)
showEmail | bool | Show the email field (default `true`)
disableEmail | bool | Make the email field readonly (default `false`)
showName | bool | Show the name field (default `true`)
disableName | bool | Make the name field readonly (default `false`)
showCard | bool | Show the card fields (default `true`)
disableCard | bool | Make the card field readonly (default `false`)
showCountry | bool | Show the country field (default `false`)
disableCountry | bool | Make the country field readonly (default `false`)
showPostcode | bool | Show the postcode field (default `false`)
disablePostcode | bool | Make the postcode field readonly (default `false`)
showVat | bool | Show the vat field (default `false`)
disableVat | bool | Make the vat field readonly (default `false`)
vatValidationUrl | string | Endpoint to validate VAT numbers (see [VAT Collection](#vat-collection)).
showCoupon | bool | Show the coupon field (default `false`)
disableCoupon | bool | Make the coupon field readonly (default `false`)
couponValidationUrl | string | Endpoint to validate coupon codes (see [Coupons](#coupons)).
showDisclaimer | bool | Show the disclaimer text (default `true`)
disclaimerText | string | Custom disclaimer text
showProvider | bool | Show the 'powered by' text (default `true`)
taxOrigin | string | Country code where you pay tax (used to automatically show/hide the VAT field based on the selected country). See [VAT Collection](#vat-collection)
prefill | object | Prefill form fields (see [Prefill](#prefill) below)


### Prefill
You can prefill all form fields using the structure specified below. Any prefilled fields can be marked as readonly by using the `disableX` options specified above.

```
prefill: {
  customer: { ... },
  card: { ... },
  coupon: '...'
}
```

The prefill structure matches the response of the server-side API `checkout.getSubscription()` helper, so you can easily prefill with all existing values:

```js
res.render('checkout', {
  checkout: {
    prefill: await checkout.getSubscription(user.stripeCustomerId)
  }
});
```

If you would like to provide customer defaults (in case the user doesn't have a stripe customer yet) you can do so simply like this:

```js
const sub = await checkout.getSubscription(user.stripeCustomerId)
res.render('checkout', {
  checkout: {
    prefill: {
      customer: sub.customer || { email: user.email },
      card: sub.card,
    }
  }
});
```

#### Customer Prefill
Name | Type | Description
-- | -- | --
email | string | Email address
name | string | Customer name
country | string | Selected country code (ISO 3166 alpha-2 country code)
vat | string | VAT number

#### Card Prefill
When card prefill is used, the form will offer the user a choice to use their existing card details or specify new card information. This is especially useful during upgrade flows, allowing users to confirm and use their existing card details. A warning is shown if the prefilled card has expired.

Name | Type | Description
-- | -- | --
month | number | Card expiry month (1-12)
year | number | Card expiry year (e.g. 2020)
last4 | string | Card last 4 numbers


## Server-Side API
The server-side helper library provides several easy-to-use helpers to manage Stripe subscriptions. You can, of course, invoke the Stripe API directly yourself if you prefer to do so.

### `checkout.getClientSecret()`
Generates a setup intent client secret required to render the client-side checkout page.

### `checkout.getSubscription( stripeCustomerId )`
Retrieve the current subscription status. Returns `valid: false` if there is no active subscription. `card` and `customer` will always be returned if available (e.g. from a previous cancelled subscription).

- `valid` - True if the subscription is in a valid state (not incomplete or past due)
- `cancelled` - True if the subscription will cancel at the end of the current period
- `card` - Card details (null if no card)
- `plan` - Plan details (null if no plan)
- `customer` - Customer details (null if no customer)
- `status` - Text friendly description (see below)
- `periodEnd` - Timestamp when current period ends

#### Example response for a valid active subscription:
A valid active subscription represents any state where the user is subscribed to a plan that is still active. This includes cases where the plan has been set to cancel at the end of the period (indicated by `cancelled` as `true`), or a first renewal attempt has failed to process.

```js
{ id: 'sub_xxx',
  valid: true,
  cancelled: false,
  card:
   { brand: 'visa',
     month: 4,
     year: 2024,
     last4: '4242',
     summary: 'Visa ending in 4242 (04/24)' },
  plan:
   { id: 'plan_xxx',
     name: 'Gold - Monthly',
     metadata: { product: 'gold', plan: 'monthly' },
     amount: 499,
     currency: 'usd',
     interval: 'month' },
  customer:
   { id: 'cus_xxx',
     email: 'customer@example.com',
     name: 'John Smith',
     country: 'IE',
     vat: 'IE6388047V' },
  status: 'Renews on Aug 31, 2019' }
```

#### Example response for a new user (no stripe customer):
A new user will not have a valid subscription and not have any existing card or customer information.

```js
{ valid: false,
  card: null,
  plan: null,
  customer: null }
```

#### Example response for a previously subscribed customer:
Note that `card` and `customer` are returned since the customer already has a card and customer information on file. `plan` is `null` and `valid` is `false` since there is no active subscription.

```js
{ valid: false,
  card: { ... },
  plan: null,
  customer: { ... } }
```

#### Example response for an invalid active subscription:
An invalid active subscription represents the cases where the user is subscribed to a plan however their card may have been declined on the first attempt or payment past due when all payment attempts have failed. Note that the only difference here is that `valid` is `false`.

```js
{ valid: false,
  card: { ... },
  plan: { ... },
  customer: { ... },
  status: 'Past due. Your card was declined' }
```

#### State Summary
status | valid | cancelled
-- | -- | --
Trailing until <trial_end> | true | false
Cancels on <current_period_end> | true | true
Renews on <current_period_end> | true | false
Invalid payment method (requires action) | false | false
Invalid payment method | false | false
Waiting for a new attempt | false | false
Past due | false | false

### `checkout.manageSubscription( stripeCustomerId, { ... } )`
Create and update subscriptions. If `stripeCustomerId` is `null` a new customer will be created automatically. Otherwise, the existing customer will be updated. The function always returns a stripe customer ID so that you can associate it with a user in your application.

#### Options
All options are optional unless specified otherwise.

Name | Type | Description
-- | -- | --
plan | string | New stripe plan ID (requires an existing payment method to be on file already, or that a new payment method is provided using the `paymentMethod` option).
email | string | New customer email address
name | string | New customer name
country | string | New customer country code
paymentMethod | string | New payment method ID
coupon | string | New coupon code to apply
trialDays | number | New trial days to apply
vat | string | New customer VAT number
taxRates | object | Tax rates to apply (see [Tax Rates](#tax-rates) below)
taxExempt | string | `taxable`, `reverse`, `exempt`
taxOrigin | string | Your tax origin used to determine taxation

#### Tax Rates
You can apply a default tax rate for all customers or individual per-country tax rates. By default all customers are set to `taxable`, unless overridden by `taxExempt` or by automatic [VAT Collection](#vat-collection).

Apply a default tax rate to all customers:

```js
{ default: 'txr_...' }
```

Apply a tax rate to eu customers only:

```js
{ eu: 'txr_...' }
```

Only apply a tax rate for `GB` customers:

```js
{ GB: 'txr_...' }
```

Apply a specific tax rate for `US` customers, otherwise use the default tax rate:

```js
{ US: 'txr_...',
  default: 'txr_...' }
```

A tax rate should be a valid Stripe `tax_rate` object ID.


### `checkout.cancelSubscription( stripeCustomerId, atPeriodEnd = true )`
Cancel an existing subscription (default at period end). If `atPeriodEnd` is `true`, the plan will cancel at the current period end and `cancelled` will be set to `true` until that time is reached. Otherwise the subscription will be cancelled immediately.

### `checkout.reactivateSubscription( stripeCustomerId )`
Reactivate a cancelled subscription. This only applies to subscriptions that are set to cancel at the period end.

### `checkout.deleteSubscription( stripeCustomerId )`
Immediately delete a subscription.

### `checkout.deleteCustomer( stripeCustomerId )`
Delete and cancel the customer's subscription.

### `checkout.getReceipts( stripeCustomerId )`
List all recent receipts. Returns an empty array `[]` if an invalid customer ID is provided.

```js
[ { date: 'Jul 31, 2019',
    currency: 'usd',
    amount: 499,
    url:
     'https://pay.stripe.com/invoice/invst_xxx/pdf' } ]
```

### `checkout.validateVatNumber`
Helper to validate VAT numbers. See [VAT number validation]()

### `checkout.validateCoupon`
Helper to validate coupon codes. See [Coupon validation]()


## VAT Collection
VAT collection rules are complicated. However, it is quite simple to automatically collect and validate VAT numbers, as well as automatically determine taxation rules for individual customers. There are 3 main steps:

### 1. Client-Side
First make sure to pass the required options when initializing the client-side library.

```js
Checkout({
  showVat: true,
  showCountry: true,
  vatValidationUrl: '/validateVat',
  taxOrigin: 'GB',
  ...
});
```

Let's go through the options one by one:
- `showVat` will show the vat number field (hidden by default)
- `showCountry` will show the country field (hidden by default)
- `vatValidationUrl` the endpoint to use for validation (covered in the next step)
- `taxOrigin` automatically toggle the vat field based on the selected country

Based on the specified tax origin and the country that the user selects, the VAT number field will be toggled automatically as described by the table below: 
taxOrigin | country | vat
-- | -- | --
non-EU country | N/A | hidden
EU country | same as tax origin | shown
EU country | other EU country | shown

When the VAT field is shown, the number provided will be validated using the specified validation endpoint. Implementation instructions are shown below.

### 2. Validation
If a `vatValidationUrl` is passed to the client-side library initialization, then the VAT number will be validated using a `GET` request to the specified URL, with a query string parameter `q` containing the VAT number. If the response status code is `200` then validation succeeds. Any other status code will fail.

```
GET /validateVatNumber?q=SE1234567891001
```

You can easily implement an API endpoint in your backend using the server-side Checkout helper function (or provide your own implementation). The default implementation wraps the [VIES VAT number validation](http://ec.europa.eu/taxation_customs/vies/) SOAP endpoint.

```js
app.get('/validateVatNumber', (req, res) => {
  checkout.validateVatNumber(req.query.q).then(valid => {
    res.status(valid ? 200 : 400).json({ valid });
  });
});
```

### 3. Server-Side
Once the payment form is submitted, be sure to specify the following options to the `checkout.manageSubscription` function.

```js
app.post('/upgrade', (req, res) => {
  checkout.manageSubscription(user.stripeCustomerId, {
    taxOrigin: 'GB',
    taxRates: { ... },
    vat: req.body.vat,
    country: req.body.country,
  }).then(...);
});
```

With these options, the taxation mode for the customer is automatically determined and the correct tax rate is applied. The table below outlines the taxation mode that will be set based on your tax origin, the country the user selects, and the vat number the user provides.

taxOrigin | country | vat | taxation
-- | -- | -- | --
non-EU | N/A | N/A | taxable
EU country | non-EU country | N/A | exempt
EU country | same as tax origin | N/A | taxable
EU country | other EU country | `null` | taxable
EU country | other EU country | provided and valid | reverse

Note that a tax rate is always attached to the customer even if the taxation mode is set to exempt or reverse.

## Coupons
Checkout supports showing a coupon code field with optional validation. To show the coupon field simply pass `coupon: true` to the client-side configuration. You can also specify a validation endpoint.

```js
Checkout({
  showCoupon: true,
  couponValidationUrl: '/validateCoupon',
  ...
})
```

Coupon validation is performed using a `GET` request to the specified validation URL. The coupon code will be passed as a query string parameter named `q`.

```
GET /validateCoupon?q=Hello123
```

You can implement your validation however you like (e.g. database lookup, hardcoded, etc.). The server-side checkout library provides a helper function to validate coupon codes directly against stripe. Valid coupon codes must return status code `200`. Any other response is treated as invalid.

```js
app.get('/validateCoupon', (req, res) => {
  checkout.validateCoupon(req.query.q).then(valid => {
    res.status(valid ? 200 : 400).json({ valid });
  });
});
```

To apply a coupon code to a subscription, simply pass the coupon code to `manageSubscription()`.

```js
app.post('/upgrade', (req, res) => {
  checkout.manageSubscription(stripeCustomerId, {
    coupon: req.body.coupon
  }).then(...);
});
```


## Example Implementation
The [example project](example/) includes a simple web app that allows a user to view their subscription, upgrade, change card, cancel and reactivate their subscription.
