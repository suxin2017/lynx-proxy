import { defineMock } from 'rspack-plugin-mock/helper';
import { mockData } from './utils/mockData';

export default defineMock({
  url: '/__self_service_path__/request_log',
  response(_req, res) {
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Content-Type', 'application/json');

    const timer = setInterval(() => {
      if (res.destroyed) {
        clearInterval(timer);
        return;
      }
      const data = mockData();
      res.write(Buffer.from(JSON.stringify({ add: data })));
    }, 1000);
  },
});
