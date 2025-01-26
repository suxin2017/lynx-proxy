import Mock from 'mockjs';

export const mockData = () => {
    const type = Mock.Random.pick([
      {
        path: 'json',
        contentType: 'application/json',
      },
      {
        path: 'formData',
        contentType: 'multipart/form-data',
      },
      {
        path: 'file',
        contentType: 'chunked',
      },
      {
        path: 'png',
        contentType: 'image/png',
      },
    ]);
  
    return Mock.mock({
      id: '@increment',
      uri: '@pick(["http","https"])://@domain()/@word()/@word()/' + type.path,
      traceId: '@guid',
      method: '@pick(["GET", "POST", "PUT", "DELETE"])',
      schema: '@pick(["http", "https"])',
      version: '@pick(["HTTP/1.1", "HTTP/2"])',
      statusCode: '@integer(200, 500)',
      header: {
        'Content-Type': type.contentType,
        'User-Agent': '@string("upper", 5, 10)',
      },
    });
  };