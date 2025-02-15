import Mock from 'mockjs';
import { mateTypes } from './mockBodyHandle';

export const mockData = (id?: number) => {
  const uid = id ?? Mock.Random.increment();
  const type = mateTypes[uid % mateTypes.length];
  const uri =
    '@pick(["http","https"])://@domain()/@word()/@word()/' + type.path;
  return Mock.mock({
    id: uid,
    uri:
      '@pick(["http","https"])://abc.com/ffff/@word(40)/@pick(["a","b","c"])/' +
      type.path + "?" + "@word()=" + "@word()",
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
