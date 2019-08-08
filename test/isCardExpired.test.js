const moment = require('moment');
const { isCardExpired } = require('../lib/util');


function getMonthYear(deltaMonth, deltaYear) {
  const m = moment();
  m.add({
    months: deltaMonth,
    years: deltaYear
  });
  return [
    m.month() + 1,
    m.year(),
  ];
}


test('same month, same year', () => {
  expect(isCardExpired(...getMonthYear(0, 0))).toBe(false);
});

test('higher month, higher year', () => {
  expect(isCardExpired(...getMonthYear(1, 1))).toBe(false);
});

test('lower month, lower year', () => {
  expect(isCardExpired(...getMonthYear(-1, -1))).toBe(true);
});

test('higher year', () => {
  expect(isCardExpired(...getMonthYear(0, 1))).toBe(false);
});

test('lower year', () => {
  expect(isCardExpired(...getMonthYear(0, -1))).toBe(true);
});

test('higher month', () => {
  expect(isCardExpired(...getMonthYear(1, 0))).toBe(false);
});

test('lower month', () => {
  expect(isCardExpired(...getMonthYear(-1, 0))).toBe(true);
});

test('lower year, higher month', () => {
  expect(isCardExpired(...getMonthYear(1, -1))).toBe(true);
});

test('lower month, higher year', () => {
  expect(isCardExpired(...getMonthYear(-1, 1))).toBe(false);
});
