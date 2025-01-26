import { defineMock } from 'rspack-plugin-mock/helper';
import { mockData } from './utils/mockData';

export default defineMock({
  url: '/__self_service_path__/response',
  body: mockData(),
});
