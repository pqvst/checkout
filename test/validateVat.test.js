const { expect } = require('chai');
const validateVat = require('../lib/validate-vat');

describe('validate-vat', () => {

  it('empty', async () => {
    expect(await validateVat()).to.equal(false);
  });

  it('valid', async () => {
    expect(await validateVat('IE', '6388047V')).to.equal(true);
  });

  it('invalid', async () => {
    expect(await validateVat('XX', 'XX')).to.equal(false);
  });

  it('invalid country', async () => {
    expect(await validateVat('XX', '6388047V')).to.equal(false);
  });

  it('invalid number', async () => {
    expect(await validateVat('IE', 'XXX')).to.equal(false);
  });

  it('malformed request', async () => {
    expect(await validateVat('<', '<')).to.equal(false);
  });

});