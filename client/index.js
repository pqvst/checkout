import Vue from 'vue';

// Inject style into DOM
import './style.css';

// Load pug template as HTML string
import template from './template.pug';

// Country data
import COUNTRIES from '../data/countries';
import EU_COUNTRY_CODES from '../data/eu_country_codes';

// Utilities
import { isCardExpired } from '../lib/util';


const defaults = {
  header: null,
  title: null,
  action: null,
  email: true,
  card: true,
  name: true,
  country: false,
  postcode: false,
  vat: false,
  coupon: false,
  disclaimer: true,
  provider: true,
  prefill: null,
};

function Checkout(opts) {
  opts = Object.assign({}, defaults, opts);
  if (opts.prefill == null) {
    opts.prefill = {};
  }
  if (opts.prefill.customer == null) {
    opts.prefill.customer = {};
  }

  const stripePublicKey = opts.stripePublicKey;
  const clientSecret = opts.clientSecret;


  function validateVat(vat) {
    return new Promise(function (resolve) {
      const request = new XMLHttpRequest();
      request.open('GET', `${opts.vatValidationUrl}?q=${vat}`, true);
      request.onload = function () { resolve(this.status === 200); };
      request.send();
    });
  }
  
  function validateCoupon(coupon) {
    return new Promise(function (resolve) {
      const request = new XMLHttpRequest();
      request.open('GET', `${opts.couponValidationUrl}?q=${coupon}`, true);
      request.onload = function () { resolve(this.status === 200); };
      request.send();
    });
  }

  const style = {
    base: {
      color: '#303030',
      fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Ubuntu,sans-serif',
      fontSize: '16px',
      '::placeholder': {
        color: '#ccc'
      }
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a'
    }
  };

  let loadError = opts.error;
  let stripe, cardNumber, cardExpiry, cardCvc;
  let paymentRequestButton, paymentRequest;

  if (!stripePublicKey) {
    loadError = 'You must provide a stripe public key.';
  } else {
    try {
      stripe = Stripe(stripePublicKey);

      paymentRequest = stripe.paymentRequest({
        country: 'US',
        currency: 'usd',
        total: {
          label: 'Test',
          amount: 0,
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });

      const elements = stripe.elements();
      cardNumber = elements.create('cardNumber', { style: style });
      cardExpiry = elements.create('cardExpiry', { style: style });
      cardCvc = elements.create('cardCvc', { style: style });
      paymentRequestButton = elements.create('paymentRequestButton', { paymentRequest });
    } catch (err) {
      loadError = err.message;
    }
  }

  if (!clientSecret) {
    loadError = 'You must provide a client secret.';
  }

  new Vue({
    el: '#checkout',

    template,

    data: {
      // Customization
      header: opts.header,
      title: opts.title,
      action: opts.action,

      // true/false/disable
      fields: {
        email: opts.email,
        card: opts.card,
        name: opts.name,
        country: opts.country,
        postcode: opts.postcode,
        coupon: opts.coupon,
        vat: opts.vat,
        disclaimer: opts.disclaimer,
        provider: opts.provider,
      },

      values: {
        email: opts.prefill.customer.email,
        card: opts.prefill.card,
        name: opts.prefill.customer.name,
        country: opts.prefill.customer.country,
        postcode: opts.prefill.customer.postcode,
        vat: opts.prefill.customer.vat,
        coupon: opts.prefill.coupon,
        paymentMethod: '',
      },

      disabled: {
        email: opts.email == 'disable',
        card: opts.card == 'disable',
        name: opts.name == 'disable',
        country: opts.country == 'disable',
        postcode: opts.postcode == 'disable',
        vat: opts.vat == 'disable',
        coupon: opts.coupon == 'disable',
      },

      errors: {
        load: loadError,
        email: null,
        card: null,
        name: null,
        country: null,
        vat: null,
        coupon: null,
      },
      
      // State
      editCard: true,
      processing: false,
      countries: COUNTRIES,
    },

    computed: {
      showVat() {
        return this.country != opts.taxOrigin && EU_COUNTRY_CODES.includes(this.country);
      },
      editCardExpired() {
        return !this.editCard && this.values.card && isCardExpired(this.values.card.exp_month, this.values.card.exp_year);
      },
      submitText() {
        return this.action || 'Continue';
      },
      disclaimerText() {
        if (this.fields.disclaimer == true) {
          return 'Your security is important to us. We do not store or process your credit card information. Online payments are passed via a secure socket layer to a payment processor where your information is tokenized (whereby a random number is generated to represent your payment). The payment processor is PCI compliant which ensures that your information is being handled in accordance with industry security standards.';
        } else {
          return this.fields.disclaimer;
        }
      },
    },

    watch: {
      showVat(value) {
        if (!value) {
          this.vat = '';
        }
      }
    },

    created() {
      this.editCard = this.values.card == null;
    },

    mounted() {
      if (stripe) {
        cardNumber.mount('#card-number');
        cardExpiry.mount('#card-expiry');
        cardCvc.mount('#card-cvc');

        paymentRequest.canMakePayment().then(function (result) {
          if (result) {
            paymentRequestButton.mount('#payment-request-button');
          } else {
            document.getElementById('payment-request-button').style.display = 'none';
          }
        });

        paymentRequest.on('paymentmethod', (ev) => {
          this.processing = true;
          ev.complete('success');
          stripe.handleCardSetup(clientSecret, { payment_method: ev.paymentMethod.id }).then((result) => {
            if (result.error) {
              this.errors.card = result.error.message;
              this.processing = false;
            } else {
              console.log('submit', result.setupIntent.payment_method);
              this.paymentMethod = result.setupIntent.payment_method;
              this.$nextTick(() => this.$refs.form.submit());
            }
          });
        });
      }
    },

    methods: {
      formatMonth(exp_month) {
        return String(exp_month).padStart(2, '0');
      },

      formatYear(exp_year) {
        return String(exp_year).slice(2);
      },

      toggleEditCard() {
        this.editCard = !this.editCard;
      },

      async submit() {
        let hasError = false;

        for (let e of Object.keys(this.errors)) {
          this.$set(this.errors, e, null);
        }
        this.processing = true;

        if (this.fields.email && !this.values.email) {
          this.errors.email = 'Required';
          hasError = true;
        }
        if (this.fields.name && !this.values.name) {
          this.errors.name = 'Required';
          hasError = true;
        }
        if (this.fields.country && !this.values.country) {
          this.errors.country = 'Required';
          hasError = true;
        }
        if (this.fields.vat && this.values.vat && opts.vatValidationUrl) {
          if (!await validateVat(this.vat)) {
            this.errors.vat = 'Invalid';
            hasError = true;
          }
        }
        if (this.fields.coupon && this.values.coupon && opts.couponValidationUrl) {
          if (!await validateCoupon(this.coupon)) {
            this.errors.coupon = 'Invalid';
            hasError = true;
          }
        }
        if (hasError) {
          this.processing = false;
          return;
        }
        if (this.values.card && !this.editCard) {
          this.$refs.form.submit();
          return;
        }

        const result = await stripe.handleCardSetup(clientSecret, cardNumber, {
          payment_method_data: {
            billing_details: {
              name: this.values.name || null,
              address: {
                country: this.values.country || null,
                postal_code: this.values.postcode || null,
              }
            }
          }
        });

        if (result.error) {
          this.errors.card = result.error.message;
          hasError = true;
        }

        if (hasError) {
          this.processing = false;
        } else {
          this.values.paymentMethod = result.setupIntent.payment_method;
          this.$nextTick(() => this.$refs.form.submit());
        }
      }
    }

  });

}

window.Checkout = Checkout;
