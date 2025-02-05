import { defineMock } from 'rspack-plugin-mock/helper';
import { mockBodyHandle } from './utils/mockBodyHandle';

export default defineMock({
  url: '/__self_service_path__/request_body',
  response: mockBodyHandle,
});
