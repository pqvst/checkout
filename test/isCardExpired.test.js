const { expect } = require('chai');
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

describe('util.isCardExpired', () => {

  it('same month, same year', () => {
    expect(isCardExpired(...getMonthYear(0, 0))).to.equal(false);
  });
  
  it('higher month, higher year', () => {
    expect(isCardExpired(...getMonthYear(1, 1))).to.equal(false);
  });
  
  it('lower month, lower year', () => {
    expect(isCardExpired(...getMonthYear(-1, -1))).to.equal(true);
  });
  
  it('higher year', () => {
    expect(isCardExpired(...getMonthYear(0, 1))).to.equal(false);
  });
  
  it('lower year', () => {
    expect(isCardExpired(...getMonthYear(0, -1))).to.equal(true);
  });
  
  it('higher month', () => {
    expect(isCardExpired(...getMonthYear(1, 0))).to.equal(false);
  });
  
  it('lower month', () => {
    expect(isCardExpired(...getMonthYear(-1, 0))).to.equal(true);
  });
  
  it('lower year, higher month', () => {
    expect(isCardExpired(...getMonthYear(1, -1))).to.equal(true);
  });
  
  it('lower month, higher year', () => {
    expect(isCardExpired(...getMonthYear(-1, 1))).to.equal(false);
  });
  
});
