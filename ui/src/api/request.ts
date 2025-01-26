import { message } from 'antd';
import { IRequestModel, IResponseBoxView } from './models';
import { useQuery } from '@tanstack/react-query';
import queryString from 'query-string';

export function fetchRequest(cb: (data: { add: IRequestModel }) => void) {
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

export const useGetRequestBodyQuery = (params: { id?: number }) => {
  return useQuery({
    queryKey: ['/__self_service_path__/request_body', params],
    queryFn: () =>
      fetch(
        `/__self_service_path__/request_body?${queryString.stringify(params)}`,
      ).then((res) => res.blob().then((blob) => blob.arrayBuffer())),
    enabled: !!params.id,
  });
};

export const useGetResponseQuery = (params: { requestId?: number }) => {
  return useQuery({
    queryKey: ['/__self_service_path__/response', params],
    queryFn: () =>
      fetch(
        `/__self_service_path__/response?${queryString.stringify(params)}`,
      ).then((res) => res.json() as Promise<IResponseBoxView>),
    enabled: !!params.requestId,
  });
};

export const useGetResponseBodyQuery = (params: {
  requestId?: number;
}) => {
  return useQuery({
    queryKey: ['/__self_service_path__/response_body', params],
    queryFn: () =>
      fetch(
        `/__self_service_path__/response_body?${queryString.stringify(params)}`,
      ).then((res) => res.blob().then((blob) => blob.arrayBuffer())),
  });
};
