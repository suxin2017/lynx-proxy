import { defineMock } from 'rspack-plugin-mock/helper';
import mockjs from 'mockjs';

export default defineMock({
  url: '/__self_service_path__/rule_group/list',
  response(_req, res) {
    res.setHeader('Content-Type', 'application/json');
    const data = mockjs.mock([{
        key: '@id',
        title: '@string',
        record: {
            id: '@id',
            name: '@string',
            children: []
        },
        "children|10": [{
            key: '@id',
            title: '@string',
            isLeaf: true,
            record: {
                id: '@id',
                name: '@string',
                children: []
            },
        }]
    }])
    res.write(Buffer.from(JSON.stringify({ message: '', data, code: 'Ok' })));
    res.end();
  },
});
