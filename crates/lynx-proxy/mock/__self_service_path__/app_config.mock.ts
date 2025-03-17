import { defineMock } from 'rspack-plugin-mock/helper';

export default defineMock({
  url: '/__self_service_path__/app_config',
  body: {
    code: 'Ok',
    message: '',
    data: {
      id: '1',
      recordingStatus: 1,
      captureHttps: true,
      maxLogSize: 10,
      clearLogSize: 5,
    },
  },
});
