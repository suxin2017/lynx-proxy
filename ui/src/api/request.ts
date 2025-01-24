import { message } from 'antd';

export function fetchRequest(cb: (data: any) => void) {
  const controller = new AbortController();
  const signal = controller.signal;
  fetch('/__self_service_path__/request_log', { signal }).then(
    async (response) => {
      const reader = response.body?.getReader();
      if (!reader) {
        return;
      }
      let done = false;
      do {
        const { done: readerDone, value } = await reader.read();
        if (readerDone) {
          done = true;
          break;
        }
        try {
          const json = JSON.parse(new TextDecoder().decode(value));
          cb(json);
        } catch (e) {
          message.error('JSON parse error in fetchRequest');
          console.error(e);
        }
      } while (!done);
    },
  );
  return controller;
}
