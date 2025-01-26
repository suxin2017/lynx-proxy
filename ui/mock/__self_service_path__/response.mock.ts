import { defineMock } from 'rspack-plugin-mock/helper';
import { mockData } from './utils/mockData';

export default defineMock({
  url: '/__self_service_path__/response',
  response(req, res) {
    res.setHeader('Content-Type', 'application/json');
    const data = mockData(Number(req.query.requestId));
    res.write(Buffer.from(JSON.stringify({ message: '', data, code: 'Ok' })));
    res.end();
  },
});
