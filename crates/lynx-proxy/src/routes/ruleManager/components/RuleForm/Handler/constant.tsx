import { Handler } from '@/api/type';
import { ConnectPassProxy } from './Connect';

export type HandlerType = Handler['type'];
export const getFormComponent = (handler: Handler) => {
  switch (handler.type) {
    case 'connectPassProxyHandler':
      return {
        title: 'Connect (Pass Proxy)',
        component: ConnectPassProxy,
      };
    default:
      return null;
  }
};
