import Vue from 'vue';

// Inject style into DOM
import style from './style.css';

// Load pug template as HTML string
import template from './template.pug';

// Country data
import COUNTRIES from '../data/countries';
import EU_COUNTRY_CODES from '../data/eu_country_codes';


function Checkout(opts) {

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

  let loadError;
  let stripe, cardNumber, cardExpiry, cardCvc;

  if (!stripePublicKey) {
    loadError = 'You must provide a stripe public key.';
  } else {
    try {
      stripe = Stripe(stripePublicKey);
      const elements = stripe.elements();
      cardNumber = elements.create('cardNumber', { style: style });
      cardExpiry = elements.create('cardExpiry', { style: style });
      cardCvc = elements.create('cardCvc', { style: style });
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
      disableEmail: opts.disableEmail,
      allowVat: opts.allowVat,
      allowCoupon: opts.allowCoupon,
      // Fields
      card: opts.card,
      email: opts.email,
      name: opts.name,
      country: opts.country,
      postcode: opts.postcode,
      coupon: opts.coupon,
      vat: opts.vat,
      paymentMethod: '',
      // State
      editCard: true,
      processing: false,
      countries: COUNTRIES,
      errors: {
        load: loadError,
        email: null,
        name: null,
        country: null,
        vat: null,
        card: null,
        postcode: null,
      }
    },

    computed: {
      showVat() {
        return this.country != opts.taxOrigin && EU_COUNTRY_CODES.includes(this.country);
      }
    },

    watch: {
      showVat(value) {
        if (!value) {
          this.vat = '';
        }
      }
    },

    created() {
      this.editCard = this.card == null;
    },

    mounted() {
      if (stripe) {
        cardNumber.mount('#card-number');
        cardExpiry.mount('#card-expiry');
        cardCvc.mount('#card-cvc');
      }
    },

    methods: {
      toggleEditCard() {
        this.editCard = !this.editCard;
      },

      async submit() {
        let hasError = false;

        for (let e of Object.keys(this.errors)) {
          this.$set(this.errors, e, null);
        }
        this.processing = true;

        if (!this.email) {
          this.errors.email = 'Required';
          hasError = true;
        }
        if (!this.name) {
          this.errors.name = 'Required';
          hasError = true;
        }
        if (!this.country) {
          this.errors.country = 'Required';
          hasError = true;
        }
        if (this.vat && opts.vatValidationUrl) {
          if (!await validateVat(this.vat)) {
            this.errors.vat = 'Invalid';
            hasError = true;
          }
        }
        if (hasError) {
          this.processing = false;
          return;
        }
        if (this.card && !this.editCard) {
          this.$refs.form.submit();
        } else {
          const result = await stripe.handleCardSetup(clientSecret, cardNumber, {
            payment_method_data: {
              billing_details: {
                name: this.name || null,
                address: {
                  country: this.country || null,
                  postal_code: this.postcode || null,
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
            this.paymentMethod = result.setupIntent.payment_method;
            this.$nextTick(() => {
              this.$refs.form.submit();
            });
          }
        }
      }
    }

  });

}

window.Checkout = Checkout;
