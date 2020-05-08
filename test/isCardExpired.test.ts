import { expect } from 'chai';
import moment from 'moment';
import { isCardExpired } from '../lib/util';


function getMonthYear(deltaMonth: number, deltaYear: number): number[] {
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
    // @ts-ignore
    expect(isCardExpired(...getMonthYear(0, 0))).to.equal(false);
  });
  
  it('higher month, higher year', () => {
    // @ts-ignore
    expect(isCardExpired(...getMonthYear(1, 1))).to.equal(false);
  });
  
  it('lower month, lower year', () => {
    // @ts-ignore
    expect(isCardExpired(...getMonthYear(-1, -1))).to.equal(true);
  });
  
  it('higher year', () => {
    // @ts-ignore
    expect(isCardExpired(...getMonthYear(0, 1))).to.equal(false);
  });
  
  it('lower year', () => {
    // @ts-ignore
    expect(isCardExpired(...getMonthYear(0, -1))).to.equal(true);
  });
  
  it('higher month', () => {
    // @ts-ignore
    expect(isCardExpired(...getMonthYear(1, 0))).to.equal(false);
  });
  
  it('lower month', () => {
    // @ts-ignore
    expect(isCardExpired(...getMonthYear(-1, 0))).to.equal(true);
  });
  
  it('lower year, higher month', () => {
    // @ts-ignore
    expect(isCardExpired(...getMonthYear(1, -1))).to.equal(true);
  });
  
  it('lower month, higher year', () => {
    // @ts-ignore
    expect(isCardExpired(...getMonthYear(-1, 1))).to.equal(false);
  });
  
});
