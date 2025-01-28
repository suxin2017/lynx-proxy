import { defineMock } from 'rspack-plugin-mock/helper';
import mockjs from 'mockjs';

export default defineMock({
  url: '/__self_service_path__/rule',
  response(_req, res) {
    res.setHeader('Content-Type', 'application/json');
    const data = mockjs.mock({
      id: '@id',
      content: {
        match: {
          uri: 'http://127.0.0.1:3002',
        },
        target: {
          uri: 'http://127.0.0.1:3002',
        },
      },
    });
    res.write(Buffer.from(JSON.stringify({ message: '', data, code: 'Ok' })));
    res.end();
  },
});
