import { getDefaultMock } from '../services/generated/default/default.msw';
import { getNetRequestMock } from '../services/generated/net-request/net-request.msw';

export const handlers = [...getNetRequestMock(), ...getDefaultMock()];
