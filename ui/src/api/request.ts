import { message } from 'antd';
import { RequestModel } from './models';
import { useQuery } from '@tanstack/react-query';
import queryString from 'query-string';

export function fetchRequest(cb: (data: { add: RequestModel }) => void) {
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

export function fetchRequestBody(params: { url: string }) {
  return fetch(
    `/__self_service_path__/request_body?${new URLSearchParams(params)}`,
  );
}

export const useGetRequestBodyQuery = (params: { uri?: string }) => {
  return useQuery({
    queryKey: ['/__self_service_path__/request_body', params],
    queryFn: () =>
      fetch(
        `/__self_service_path__/request_body?${queryString.stringify(params)}`,
      ).then((res) => res.blob().then((blob) => blob.arrayBuffer())),
    enabled: !!params.uri,
  });
};

export const useGetResponseQuery = (params: { requireId?: number }) => {
  return useQuery({
    queryKey: ['/__self_service_path__/response', params],
    queryFn: () =>
      fetch(
        `/__self_service_path__/response?${queryString.stringify(params)}`,
      ).then((res) => res.json()),
    enabled: !!params.requireId,
  });
};

export const useGetResponseBodyQuery = (params: {
  requireId?: number;
  uri?: string;
}) => {
  return useQuery({
    queryKey: ['/__self_service_path__/response_body', params],
    queryFn: () =>
      fetch(
        `/__self_service_path__/response_body?${queryString.stringify(params)}`,
      ).then((res) => res.blob().then((blob) => blob.arrayBuffer())),
    enabled: !!params.uri,
  });
};
