import { defineMock } from 'rspack-plugin-mock/helper';
import mockjs from 'mockjs';

export default defineMock({
  url: '/__self_service_path__/rule',
  response(_req, res) {
    res.setHeader('Content-Type', 'application/json');
    const data = mockjs.mock({
      id: '@id',
      capture: {
        uri: mockjs.mock('http://@ip():@integer(1, 65535)'),
      },
      handler: {
        proxyPass: mockjs.mock('http://@ip():@integer(1, 65535)'),
      },
    });
    res.write(Buffer.from(JSON.stringify({ message: '', data, code: 'Ok' })));
    res.end();
  },
});
