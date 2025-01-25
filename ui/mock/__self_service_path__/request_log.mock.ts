import { defineMock } from 'rspack-plugin-mock/helper';
import Mock from 'mockjs';

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
      const mockData = Mock.mock({
        id: '@increment',
        uri: '@pick(["http","https"])://@domain()/@word()/@word()/@pick(["formData","json","file","png"])',
        traceId: '@guid',
        method: '@pick(["GET", "POST", "PUT", "DELETE"])',
        schema: '@pick(["http", "https"])',
        version: '@pick(["HTTP/1.1", "HTTP/2"])',
        statusCode: '@integer(200, 500)',
        header: {
          'Content-Type': '@pick(["application/json", "multipart/form-data"])',
          'User-Agent': '@string("upper", 5, 10)',
        },
      });
      res.write(Buffer.from(JSON.stringify({ add: mockData })));
    }, 1000);
  },
});
