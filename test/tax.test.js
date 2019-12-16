const { expect } = require('chai');
const { getTaxExempt, getTaxId, getTaxRate, getTax } = require('../lib/tax');

describe('tax', () => {

  //--------------------------------------------------------------------------------
  // getTaxExempt
  //--------------------------------------------------------------------------------

  describe('.getTaxExempt', () => {

    it('empty', () => {
      expect(getTaxExempt()).to.equal(null);
    });
    
    // eu origin is always taxed!
    it('eu origin', () => {
      expect(getTaxExempt('SE', null, 'SE')).to.equal('none');
    });
    
    // eu origin is always taxed!
    it('eu origin with vat', () => {
      expect(getTaxExempt('SE', 'SE123456789', 'SE')).to.equal('none');
    });
    
    // other eu countries are taxed
    it('eu non-origin', () => {
      expect(getTaxExempt('SE', null, 'GB')).to.equal('none');
    });
    
    // other eu countries with a vat number are reverse charged
    it('eu non-origin with vat', () => {
      expect(getTaxExempt('SE', 'SE123456789', 'GB')).to.equal('reverse');
    });
    
    // non-eu countries are never taxed
    it('non-eu origin', () => {
      expect(getTaxExempt('US', null, 'US')).to.equal('exempt');
    });
    
    // non-eu countries are never taxed
    it('non-eu non-origin', () => {
      expect(getTaxExempt('US', null, 'JP')).to.equal('exempt');
    });
    
  });

  //--------------------------------------------------------------------------------
  // getTaxId
  //--------------------------------------------------------------------------------

  describe('.getTaxId', () => {

    it('empty', () => {
      expect(getTaxId()).to.equal(null);
    });

    it('eu', () => {
      expect(getTaxId('SE')).to.equal(null);
    });

    it('eu with vat', () => {
      expect(getTaxId('SE', 'SE123456789')).to.deep.equal({ type: 'eu_vat', value: 'SE123456789' });
    });

    it('non-eu', () => {
      expect(getTaxId('US')).to.equal(null);
    });

    it('non-eu with vat', () => {
      expect(getTaxId('US', 'XXX')).to.equal(null);
    });

  });

  //--------------------------------------------------------------------------------
  // getTaxRate
  //--------------------------------------------------------------------------------

  describe('.getTaxRate', () => {

    it('empty', () => {
      expect(getTaxRate()).to.equal(null);
    });

    it('none', () => {
      expect(getTaxRate('SE')).to.equal(null);
    });

    it('missing', () => {
      expect(getTaxRate('US', {})).to.equal(null);
    });

    it('default', () => {
      expect(getTaxRate('SE', { US: 'us_tax_rate', default: 'default_tax_rate' })).to.equal('default_tax_rate');
    });

    it('country', () => {
      expect(getTaxRate('US', { US: 'us_tax_rate', default: 'default_tax_rate' })).to.equal('us_tax_rate');
    });

  });

  //--------------------------------------------------------------------------------
  // getTax
  //--------------------------------------------------------------------------------

  describe('.getTax', () => {

    it('empty', () => {
      expect(getTax()).to.deep.equal({ tax_exempt: null, tax_id: null, tax_rate: null });
    });
    
    it('all', () => {
      expect(getTax('SE', 'SE123456789', 'GB', { default: 'default_tax_rate' })).to.deep.equal({
        tax_exempt: 'reverse',
        tax_id: { type: 'eu_vat', value: 'SE123456789' },
        tax_rate: 'default_tax_rate',
      });
    });

  });

});