import { expect } from 'chai';
import { formatUnixDate } from '../lib/util';

describe('util.formatUnixDate', () => {
  
  it('should handle empty', () => {
    expect(formatUnixDate()).to.equal('');
  });

  it('invalid arg', () => {
    // @ts-ignore
    expect(formatUnixDate('asdfkjasldf')).to.equal('');
  });
  
  it('invalid number', () => {
    expect(formatUnixDate(123123123123123123)).to.equal('');
  });
  
  it('valid', () => {
    expect(formatUnixDate(1564747200)).to.equal('Aug 2, 2019');
  });

});
