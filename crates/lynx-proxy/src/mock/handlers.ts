import { faker } from '@faker-js/faker';
import { getDefaultMock } from '../services/generated/default/default.msw';
import {
  getGetCachedRequestsMockHandler,
  getGetCaptureStatusMockHandler,
  getToggleCaptureMockHandler,
} from '../services/generated/net-request/net-request.msw';
import { getRequestProcessingMock } from '../services/generated/request-processing/request-processing.msw';
import { ResponseCode } from '../services/generated/utoipaAxum.schemas';

export const handlers = [
  getGetCachedRequestsMockHandler(() => ({
    code: ResponseCode.ok,
    data: {
      newRequests: [
        {
          status: 'RequestStarted',
          traceId: faker.string.uuid(),
          isNew: true,
          request: {
            method: 'GET',
            url: 'https://demo.piesocket.com/v3/channel_123?api_key=VCXCEuvhGcBDP7XhiJJUDvR1e1D3eiVjgZ9VRiaV&notify_self',
            headers: {
              'sec-websocket-extensions':
                'permessage-deflate; client_max_window_bits',
              'sec-websocket-version': '13',
              'sec-websocket-key': 'WXDkka6bQsJtypxHeR4Vkw==',
              connection: 'Upgrade',
              upgrade: 'websocket',
              host: 'demo.piesocket.com',
            },
            version: 'HTTP/1.1',
            headerSize: 185,
            body: '',
          },
          response: null,
          messages: {
            status: 'Start',
            message: [],
          },
          tunnel: null,
          timings: {
            requestStart: 1748095420253,
            requestEnd: null,
            requestBodyStart: null,
            requestBodyEnd: 1748095420253,
            proxyStart: null,
            proxyEnd: null,
            reponseBodyStart: null,
            reponseBodyEnd: null,
            tunnelStart: null,
            tunnelEnd: null,
            websocketStart: 1748095420253,
            websocketEnd: null,
          },
        },
      ],
    },
    message: null,
  })),
  getGetCaptureStatusMockHandler(),
  getToggleCaptureMockHandler(),
  ...getDefaultMock(),
  ...getRequestProcessingMock()
];
