const http = require('http');
const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/catalogos/cursos',
  method: 'GET',
};
const req = http.request(options, (res) => {
  console.log('STATUS', res.statusCode);
  console.log('HEADERS', JSON.stringify(res.headers));
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log('BODY', data); });
});
req.on('error', (err) => { console.error('ERROR', err); });
req.end();
