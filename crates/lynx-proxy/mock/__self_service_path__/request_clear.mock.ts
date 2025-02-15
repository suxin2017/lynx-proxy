import { defineMock } from "rspack-plugin-mock/helper";

export default defineMock({
    url: '/__self_service_path__/request/clear',
    body: {
        code: 'Ok',
        message: '',
        data: null,
    },
});