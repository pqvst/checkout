const { getTaxExempt, getTaxId, getTaxRate, getTax } = require('../lib/tax');


//--------------------------------------------------------------------------------
// getTaxExempt
//--------------------------------------------------------------------------------

test('getTaxExempt: empty', () => {
  expect(getTaxExempt()).toEqual(null);
});

// eu origin is always taxed!
test('getTaxExempt: eu origin', () => {
  expect(getTaxExempt('SE', null, 'SE')).toEqual('none');
});

// eu origin is always taxed!
test('getTaxExempt: eu origin with vat', () => {
  expect(getTaxExempt('SE', 'SE123456789', 'SE')).toEqual('none');
});

// other eu countries are taxed
test('getTaxExempt: eu non-origin', () => {
  expect(getTaxExempt('SE', null, 'GB')).toEqual('none');
});

// other eu countries with a vat number are reverse charged
test('getTaxExempt: eu non-origin with vat', () => {
  expect(getTaxExempt('SE', 'SE123456789', 'GB')).toEqual('reverse');
});

// non-eu countries are never taxed
test('getTaxExempt: non-eu origin', () => {
  expect(getTaxExempt('US', null, 'US')).toEqual('exempt');
});

// non-eu countries are never taxed
test('getTaxExempt: non-eu non-origin', () => {
  expect(getTaxExempt('US', null, 'JP')).toEqual('exempt');
});


//--------------------------------------------------------------------------------
// getTaxId
//--------------------------------------------------------------------------------

test('getTaxId: empty', () => {
  expect(getTaxId()).toEqual(null);
});

test('getTaxId: eu', () => {
  expect(getTaxId('SE')).toEqual(null);
});

test('getTaxId: eu with vat', () => {
  expect(getTaxId('SE', 'SE123456789')).toEqual({ type: 'eu_vat', value: 'SE123456789' });
});

test('getTaxId: non-eu', () => {
  expect(getTaxId('US')).toEqual(null);
});

test('getTaxId: non-eu with vat', () => {
  expect(getTaxId('US', 'XXX')).toEqual(null);
});


//--------------------------------------------------------------------------------
// getTaxRate
//--------------------------------------------------------------------------------

test('getTaxRate: empty', () => {
  expect(getTaxRate()).toEqual(null);
});

test('getTaxRate: none', () => {
  expect(getTaxRate('SE')).toEqual(null);
});

test('getTaxRate: missing', () => {
  expect(getTaxRate('US', {})).toEqual(null);
});

test('getTaxRate: default', () => {
  expect(getTaxRate('SE', { US: 'us_tax_rate', default: 'default_tax_rate' })).toEqual('default_tax_rate');
});

test('getTaxRate: country', () => {
  expect(getTaxRate('US', { US: 'us_tax_rate', default: 'default_tax_rate' })).toEqual('us_tax_rate');
});


//--------------------------------------------------------------------------------
// getTax
//--------------------------------------------------------------------------------

test('getTax: empty', () => {
  expect(getTax()).toEqual({ tax_exempt: null, tax_id: null, tax_rate: null });
});

test('getTax: all', () => {
  expect(getTax('SE', 'SE123456789', 'GB', { default: 'default_tax_rate' })).toEqual({
    tax_exempt: 'reverse',
    tax_id: { type: 'eu_vat', value: 'SE123456789' },
    tax_rate: 'default_tax_rate',
  });
});
