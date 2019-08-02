const url = require('url');
const http = require('http');

const serviceUrl = 'http://ec.europa.eu/taxation_customs/vies/services/checkVatService';

const parsedUrl = url.parse(serviceUrl);

function request(options, payload) {
  return new Promise((resolve, reject) => {
    let buffer = '';

    const req = http.request(options, (res) => {
      res.setEncoding('utf8');
      res.on('data', chunk => buffer += chunk);
      res.on('end', () => resolve(buffer));
    });
    
    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

module.exports = async function (countryCode, vatNumber) {
  const payload = `
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
      xmlns:tns1="urn:ec.europa.eu:taxud:vies:services:checkVat:types"
      xmlns:impl="urn:ec.europa.eu:taxud:vies:services:checkVat">
      <soap:Header>
      </soap:Header>
      <soap:Body>
        <tns1:checkVat xmlns:tns1="urn:ec.europa.eu:taxud:vies:services:checkVat:types"
        xmlns="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
        <tns1:countryCode>${countryCode}</tns1:countryCode>
        <tns1:vatNumber>${vatNumber}</tns1:vatNumber>
        </tns1:checkVat>
      </soap:Body>
    </soap:Envelope>
  `;

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': payload.length,
    'User-Agent': 'node',
    'Accept': 'text/html,application/xhtml+xml,application/xml,text/xml;q=0.9,*/*;q=0.8',
    'Accept-Encoding': 'none',
    'Accept-Charset': 'utf-8',
    'Connection': 'close',
    'Host': parsedUrl.hostname,
    'SOAPAction': 'urn:ec.europa.eu:taxud:vies:services:checkVat/checkVat',
  };

  const options = {
    method: 'POST',
    host: parsedUrl.host,
    path: parsedUrl.path,
    headers: headers,
  };

  const resp = await request(options, payload);
  return resp.includes('<valid>true</valid>');
};
