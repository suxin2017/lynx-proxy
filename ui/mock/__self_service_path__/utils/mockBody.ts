import Mock from 'mockjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';


export async function mockBody(type: 'json' | 'formData' | 'file') {
    if (type === 'json') {
      return Mock.mock({
        id: '@integer(1, 1000)',
        name: '@name',
        age: '@integer(20, 50)',
        email: '@email',
        address: '@county(true)',
        phone: '@string("number", 10)',
        website: '@url',
        company: {
          name: '@company',
          catchPhrase: '@sentence(3, 5)',
          bs: '@sentence(2, 4)',
        },
        date: '@date("yyyy-MM-dd")',
        time: '@time("HH:mm:ss")',
        datetime: '@datetime("yyyy-MM-dd HH:mm:ss")',
        ip: '@ip',
        guid: '@guid',
        avatar: '@image("200x200", "#50B347", "#FFF", "Mock.js")',
      });
    } else if (type === 'formData') {
      const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
      const formData = [
        `--${boundary}`,
        `Content-Disposition: form-data; name="name"`,
        '',
        Mock.Random.name(),
        `--${boundary}`,
        `Content-Disposition: form-data; name="email"`,
        '',
        Mock.Random.email(),
        `--${boundary}`,
        `Content-Disposition: form-data; name="file"; filename="hello.txt"`,
        'Content-Type: text/plain',
        '',
        'hello world',
        `--${boundary}--`,
        '',
      ].join('\r\n');
      return { formData, boundary };
    } else if (type === 'file') {
      const blob = await new Blob(['hello world'], {
        type: 'text/plain',
      }).arrayBuffer();
      return Buffer.from(blob);
    } else if (type === 'png') {
      return readFileSync(join(__dirname, 'mock/__self_service_path__', 'FFF.png'));
    }
  }