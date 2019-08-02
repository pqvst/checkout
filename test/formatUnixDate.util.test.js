const { formatUnixDate } = require('../lib/util');


test('empty', () => {
  expect(formatUnixDate()).toBe('');
});

test('invalid arg', () => {
  expect(formatUnixDate('asdfkjasldf')).toBe('');
});

test('invalid number', () => {
  expect(formatUnixDate(123123123123123123)).toBe('');
});

test('valid', () => {
  expect(formatUnixDate(1564747200)).toBe('Aug 2, 2019');
});
