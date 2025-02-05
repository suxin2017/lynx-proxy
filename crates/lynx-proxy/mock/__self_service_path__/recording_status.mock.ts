import { defineMock } from 'rspack-plugin-mock/helper';

export default defineMock({
  url: '/__self_service_path__/app_config/record_status',
  body: {
    code: 'Ok',
    message: '',
    data: null,
  },
});
