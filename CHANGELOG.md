# Changelog

### 2.2.0

- Fixing compatibility with stripe api version 2020-08-27
- Adding option to specify a tax rate for eu countries only

### 2.1.0

- Fixed not able to cancel/reactivate/delete past_due and incomplete subscriptions.
- Fixed status for cancelled trialing, past_due, and incomplete subscriptions.

### 2.0.1

- Fixed `subscription.metadata` type

### 2.0.0

- **BREAKING:** Moved client dist from `dist/checkout.js` to `dist/client/checkout.js`
- Added `periodEnd` timestamp to subscription object returned from `getSubscription`
- Converted project source to TypeScript
