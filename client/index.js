import Vue from 'vue';

// Inject style into DOM
import style from './style.css';

// Load pug template as HTML string
import template from './template.pug';

function Checkout(opts) {

  const stripePublicKey = opts.stripePublicKey;
  const clientSecret = opts.clientSecret;

  const COUNTRIES = getCountries();
  const EU_COUNTRY_CODES = getCountriesInEU();

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
      hideVatNumber: opts.hideVatNumber,
      showCoupon: opts.showCoupon,
      // Fields
      email: opts.email,
      name: opts.name,
      country: opts.country,
      coupon: opts.coupon,
      vat: opts.vat,
      payment_method: '',
      // State
      processing: false,
      countries: COUNTRIES,
      errors: {
        load: loadError,
        email: null,
        name: null,
        country: null,
        vat: null,
        card: null,
      }
    },

    computed: {
      isCountryInEU() {
        return EU_COUNTRY_CODES.includes(this.country);
      }
    },

    watch: {
      isCountryInEU(value) {
        if (!value) {
          this.vat = '';
        }
      }
    },

    mounted() {
      if (stripe) {
        cardNumber.mount('#card-number');
        cardExpiry.mount('#card-expiry');
        cardCvc.mount('#card-cvc');
      }
    },

    methods: {
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
        const result = await stripe.handleCardSetup(clientSecret, cardNumber, {
          payment_method_data: {
            billing_details: { 
              name: this.name || null,
              address: {
                country: this.country || null,
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
          this.payment_method = result.setupIntent.payment_method;
          this.$nextTick(() => {
            this.$refs.form.submit();
          });
        }
      }
    }

  });

  function getCountriesInEU() {
    return ['AT','BE','BG','HR','CY','CZ','DK','EE','FO','FI','FR','GF','DE','GI','GR','HU','IE','IM','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','GB'];
  }

  function getCountries() {
    return [
      { value: 'AF', label: 'Afghanistan' },
      { value: 'AX', label: 'Åland Islands' },
      { value: 'AL', label: 'Albania' },
      { value: 'DZ', label: 'Algeria' },
      { value: 'AD', label: 'Andorra' },
      { value: 'AO', label: 'Angola' },
      { value: 'AI', label: 'Anguilla' },
      { value: 'AQ', label: 'Antarctica' },
      { value: 'AG', label: 'Antigua & Barbuda' },
      { value: 'AR', label: 'Argentina' },
      { value: 'AM', label: 'Armenia' },
      { value: 'AW', label: 'Aruba' },
      { value: 'AC', label: 'Ascension Island' },
      { value: 'AU', label: 'Australia' },
      { value: 'AT', label: 'Austria' },
      { value: 'AZ', label: 'Azerbaijan' },
      { value: 'BS', label: 'Bahamas' },
      { value: 'BH', label: 'Bahrain' },
      { value: 'BD', label: 'Bangladesh' },
      { value: 'BB', label: 'Barbados' },
      { value: 'BY', label: 'Belarus' },
      { value: 'BE', label: 'Belgium' },
      { value: 'BZ', label: 'Belize' },
      { value: 'BJ', label: 'Benin' },
      { value: 'BM', label: 'Bermuda' },
      { value: 'BT', label: 'Bhutan' },
      { value: 'BO', label: 'Bolivia' },
      { value: 'BA', label: 'Bosnia & Herzegovina' },
      { value: 'BW', label: 'Botswana' },
      { value: 'BV', label: 'Bouvet Island' },
      { value: 'BR', label: 'Brazil' },
      { value: 'IO', label: 'British Indian Ocean Territory' },
      { value: 'VG', label: 'British Virgin Islands' },
      { value: 'BN', label: 'Brunei' },
      { value: 'BG', label: 'Bulgaria' },
      { value: 'BF', label: 'Burkina Faso' },
      { value: 'BI', label: 'Burundi' },
      { value: 'KH', label: 'Cambodia' },
      { value: 'CM', label: 'Cameroon' },
      { value: 'CA', label: 'Canada' },
      { value: 'CV', label: 'Cape Verde' },
      { value: 'BQ', label: 'Caribbean Netherlands' },
      { value: 'KY', label: 'Cayman Islands' },
      { value: 'CF', label: 'Central African Republic' },
      { value: 'TD', label: 'Chad' },
      { value: 'CL', label: 'Chile' },
      { value: 'CN', label: 'China' },
      { value: 'CO', label: 'Colombia' },
      { value: 'KM', label: 'Comoros' },
      { value: 'CG', label: 'Congo - Brazzaville' },
      { value: 'CD', label: 'Congo - Kinshasa' },
      { value: 'CK', label: 'Cook Islands' },
      { value: 'CR', label: 'Costa Rica' },
      { value: 'CI', label: 'Côte d’Ivoire' },
      { value: 'HR', label: 'Croatia' },
      { value: 'CW', label: 'Curaçao' },
      { value: 'CY', label: 'Cyprus' },
      { value: 'CZ', label: 'Czechia' },
      { value: 'DK', label: 'Denmark' },
      { value: 'DJ', label: 'Djibouti' },
      { value: 'DM', label: 'Dominica' },
      { value: 'DO', label: 'Dominican Republic' },
      { value: 'EC', label: 'Ecuador' },
      { value: 'EG', label: 'Egypt' },
      { value: 'SV', label: 'El Salvador' },
      { value: 'GQ', label: 'Equatorial Guinea' },
      { value: 'ER', label: 'Eritrea' },
      { value: 'EE', label: 'Estonia' },
      { value: 'SZ', label: 'Eswatini' },
      { value: 'ET', label: 'Ethiopia' },
      { value: 'FK', label: 'Falkland Islands' },
      { value: 'FO', label: 'Faroe Islands' },
      { value: 'FJ', label: 'Fiji' },
      { value: 'FI', label: 'Finland' },
      { value: 'FR', label: 'France' },
      { value: 'GF', label: 'French Guiana' },
      { value: 'PF', label: 'French Polynesia' },
      { value: 'TF', label: 'French Southern Territories' },
      { value: 'GA', label: 'Gabon' },
      { value: 'GM', label: 'Gambia' },
      { value: 'GE', label: 'Georgia' },
      { value: 'DE', label: 'Germany' },
      { value: 'GH', label: 'Ghana' },
      { value: 'GI', label: 'Gibraltar' },
      { value: 'GR', label: 'Greece' },
      { value: 'GL', label: 'Greenland' },
      { value: 'GD', label: 'Grenada' },
      { value: 'GP', label: 'Guadeloupe' },
      { value: 'GU', label: 'Guam' },
      { value: 'GT', label: 'Guatemala' },
      { value: 'GG', label: 'Guernsey' },
      { value: 'GN', label: 'Guinea' },
      { value: 'GW', label: 'Guinea-Bissau' },
      { value: 'GY', label: 'Guyana' },
      { value: 'HT', label: 'Haiti' },
      { value: 'HN', label: 'Honduras' },
      { value: 'HK', label: 'Hong Kong SAR China' },
      { value: 'HU', label: 'Hungary' },
      { value: 'IS', label: 'Iceland' },
      { value: 'IN', label: 'India' },
      { value: 'ID', label: 'Indonesia' },
      { value: 'IR', label: 'Iran' },
      { value: 'IQ', label: 'Iraq' },
      { value: 'IE', label: 'Ireland' },
      { value: 'IM', label: 'Isle of Man' },
      { value: 'IL', label: 'Israel' },
      { value: 'IT', label: 'Italy' },
      { value: 'JM', label: 'Jamaica' },
      { value: 'JP', label: 'Japan' },
      { value: 'JE', label: 'Jersey' },
      { value: 'JO', label: 'Jordan' },
      { value: 'KZ', label: 'Kazakhstan' },
      { value: 'KE', label: 'Kenya' },
      { value: 'KI', label: 'Kiribati' },
      { value: 'XK', label: 'Kosovo' },
      { value: 'KW', label: 'Kuwait' },
      { value: 'KG', label: 'Kyrgyzstan' },
      { value: 'LA', label: 'Laos' },
      { value: 'LV', label: 'Latvia' },
      { value: 'LB', label: 'Lebanon' },
      { value: 'LS', label: 'Lesotho' },
      { value: 'LR', label: 'Liberia' },
      { value: 'LY', label: 'Libya' },
      { value: 'LI', label: 'Liechtenstein' },
      { value: 'LT', label: 'Lithuania' },
      { value: 'LU', label: 'Luxembourg' },
      { value: 'MO', label: 'Macao SAR China' },
      { value: 'MG', label: 'Madagascar' },
      { value: 'MW', label: 'Malawi' },
      { value: 'MY', label: 'Malaysia' },
      { value: 'MV', label: 'Maldives' },
      { value: 'ML', label: 'Mali' },
      { value: 'MT', label: 'Malta' },
      { value: 'MQ', label: 'Martinique' },
      { value: 'MR', label: 'Mauritania' },
      { value: 'MU', label: 'Mauritius' },
      { value: 'YT', label: 'Mayotte' },
      { value: 'MX', label: 'Mexico' },
      { value: 'MD', label: 'Moldova' },
      { value: 'MC', label: 'Monaco' },
      { value: 'MN', label: 'Mongolia' },
      { value: 'ME', label: 'Montenegro' },
      { value: 'MS', label: 'Montserrat' },
      { value: 'MA', label: 'Morocco' },
      { value: 'MZ', label: 'Mozambique' },
      { value: 'MM', label: 'Myanmar (Burma)' },
      { value: 'NA', label: 'Namibia' },
      { value: 'NR', label: 'Nauru' },
      { value: 'NP', label: 'Nepal' },
      { value: 'NL', label: 'Netherlands' },
      { value: 'NC', label: 'New Caledonia' },
      { value: 'NZ', label: 'New Zealand' },
      { value: 'NI', label: 'Nicaragua' },
      { value: 'NE', label: 'Niger' },
      { value: 'NG', label: 'Nigeria' },
      { value: 'NU', label: 'Niue' },
      { value: 'MK', label: 'North Macedonia' },
      { value: 'NO', label: 'Norway' },
      { value: 'OM', label: 'Oman' },
      { value: 'PK', label: 'Pakistan' },
      { value: 'PS', label: 'Palestinian Territories' },
      { value: 'PA', label: 'Panama' },
      { value: 'PG', label: 'Papua New Guinea' },
      { value: 'PY', label: 'Paraguay' },
      { value: 'PE', label: 'Peru' },
      { value: 'PH', label: 'Philippines' },
      { value: 'PN', label: 'Pitcairn Islands' },
      { value: 'PL', label: 'Poland' },
      { value: 'PT', label: 'Portugal' },
      { value: 'PR', label: 'Puerto Rico' },
      { value: 'QA', label: 'Qatar' },
      { value: 'RE', label: 'Réunion' },
      { value: 'RO', label: 'Romania' },
      { value: 'RU', label: 'Russia' },
      { value: 'RW', label: 'Rwanda' },
      { value: 'WS', label: 'Samoa' },
      { value: 'SM', label: 'San Marino' },
      { value: 'ST', label: 'São Tomé & Príncipe' },
      { value: 'SA', label: 'Saudi Arabia' },
      { value: 'SN', label: 'Senegal' },
      { value: 'RS', label: 'Serbia' },
      { value: 'SC', label: 'Seychelles' },
      { value: 'SL', label: 'Sierra Leone' },
      { value: 'SG', label: 'Singapore' },
      { value: 'SX', label: 'Sint Maarten' },
      { value: 'SK', label: 'Slovakia' },
      { value: 'SI', label: 'Slovenia' },
      { value: 'SB', label: 'Solomon Islands' },
      { value: 'SO', label: 'Somalia' },
      { value: 'ZA', label: 'South Africa' },
      { value: 'GS', label: 'South Georgia & South Sandwich Islands' },
      { value: 'KR', label: 'South Korea' },
      { value: 'SS', label: 'South Sudan' },
      { value: 'ES', label: 'Spain' },
      { value: 'LK', label: 'Sri Lanka' },
      { value: 'BL', label: 'St. Barthélemy' },
      { value: 'SH', label: 'St. Helena' },
      { value: 'KN', label: 'St. Kitts & Nevis' },
      { value: 'LC', label: 'St. Lucia' },
      { value: 'MF', label: 'St. Martin' },
      { value: 'PM', label: 'St. Pierre & Miquelon' },
      { value: 'VC', label: 'St. Vincent & Grenadines' },
      { value: 'SR', label: 'Suriname' },
      { value: 'SJ', label: 'Svalbard & Jan Mayen' },
      { value: 'SE', label: 'Sweden' },
      { value: 'CH', label: 'Switzerland' },
      { value: 'TW', label: 'Taiwan' },
      { value: 'TJ', label: 'Tajikistan' },
      { value: 'TZ', label: 'Tanzania' },
      { value: 'TH', label: 'Thailand' },
      { value: 'TL', label: 'Timor-Leste' },
      { value: 'TG', label: 'Togo' },
      { value: 'TK', label: 'Tokelau' },
      { value: 'TO', label: 'Tonga' },
      { value: 'TT', label: 'Trinidad & Tobago' },
      { value: 'TA', label: 'Tristan da Cunha' },
      { value: 'TN', label: 'Tunisia' },
      { value: 'TR', label: 'Turkey' },
      { value: 'TM', label: 'Turkmenistan' },
      { value: 'TC', label: 'Turks & Caicos Islands' },
      { value: 'TV', label: 'Tuvalu' },
      { value: 'UG', label: 'Uganda' },
      { value: 'UA', label: 'Ukraine' },
      { value: 'AE', label: 'United Arab Emirates' },
      { value: 'GB', label: 'United Kingdom' },
      { value: 'US', label: 'United States' },
      { value: 'UY', label: 'Uruguay' },
      { value: 'UZ', label: 'Uzbekistan' },
      { value: 'VU', label: 'Vanuatu' },
      { value: 'VA', label: 'Vatican City' },
      { value: 'VE', label: 'Venezuela' },
      { value: 'VN', label: 'Vietnam' },
      { value: 'WF', label: 'Wallis & Futuna' },
      { value: 'EH', label: 'Western Sahara' },
      { value: 'YE', label: 'Yemen' },
      { value: 'ZM', label: 'Zambia' },
      { value: 'ZW', label: 'Zimbabwe' },
    ];
  }

}

window.Checkout = Checkout;
