import { defineMock } from 'rspack-plugin-mock/helper';

export default defineMock({
  url: '/__self_service_path__/rule/context/schema',
  body: {
    code: 'Ok',
    message: null,
    data: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      definitions: {
        Capture: {
          properties: {
            uri: {
              description:
                'use glob pattern to match the uri syntax: https://crates.io/crates/glob-match',
              type: 'string',
            },
          },
          required: ['uri'],
          type: 'object',
        },
        Handler: {
          properties: {
            proxyPass: {
              description:
                'proxy pass to the target example: http://localhost:8080',
              type: 'string',
            },
          },
          required: ['proxyPass'],
          type: 'object',
        },
      },
      properties: {
        capture: { $ref: '#/definitions/Capture' },
        handler: { $ref: '#/definitions/Handler' },
      },
      required: ['capture', 'handler'],
      title: 'RuleContent',
      type: 'object',
    },
  },
});
