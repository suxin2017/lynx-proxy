import Mock from 'mockjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export async function mockBody(
  type:
    | 'json'
    | 'formData'
    | 'file'
    | 'png'
    | 'js'
    | 'css'
    | 'html'
    | 'normalFormData'
    | 'video',
) {
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
    return readFileSync(
      join(__dirname, 'mock/__self_service_path__', 'FFF.png'),
    );
  } else if (type === 'css') {
    const blob = await new Blob(['*{\nbackground: res;\n}'], {
      type: 'text/css',
    }).arrayBuffer();
    return Buffer.from(blob);
  } else if (type === 'html') {
    const blob = await new Blob(
      [
        '<html>\n<head>\n<title>Mock</title>\n</head>\n<body>\n<h1>Hello, Mock!</h1>\n</body>\n</html>',
      ],
      {
        type: 'text/html',
      },
    ).arrayBuffer();
    return Buffer.from(blob);
  } else if (type === 'js') {
    const blob = await new Blob(
      [
        `async function d() {
    const e = await import("../../../renderContent-9d534bdd.js")
      , o = await import("../../../AppVite-01e8c07a.js")
      , n = e.default
      , t = o.default;
    await n(["assets/AppVite-041b9295.css"], "modheader-shadow-root-host-el-id", "modhader-tool-root", a => {
        new t({
            target: a
        })
    }
    )
}
chrome.storage.local.get(["show_side_ball", "disable_side_ball_domains"], async e => {
    const o = e.disable_side_ball_domains || [];
    e.show_side_ball === !0 && o.indexOf(window.location.hostname) === -1 && d().catch(console.error)
}
);
`,
      ],
      {
        type: 'application/x-javascript',
      },
    ).arrayBuffer();
    return Buffer.from(blob);
  } else if (type === 'normalFormData') {
    return 'fname=John&lname=Doe';
  } else if (type === 'video') {
    return readFileSync(
      join(__dirname, 'mock/__self_service_path__', 'rabbit320.webm'),
    );
  }
}
