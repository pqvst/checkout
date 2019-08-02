const validateVat = require('../lib/validate-vat');

test('empty', async () => {
  expect(await validateVat()).toBe(false);
});

test('valid', async () => {
  expect(await validateVat('IE', '6388047V')).toBe(true);
});

test('invalid', async () => {
  expect(await validateVat('XX', 'XX')).toBe(false);
});

test('invalid country', async () => {
  expect(await validateVat('XX', '6388047V')).toBe(false);
});

test('invalid number', async () => {
  expect(await validateVat('IE', 'XXX')).toBe(false);
});

test('malformed request', async () => {
  expect(await validateVat('<', '<')).toBe(false);
});
