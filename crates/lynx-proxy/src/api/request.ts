import { App, message } from 'antd';
import { IRequestModel, IResponseBoxView } from './models';
import { useMutation, useQuery } from '@tanstack/react-query';
import queryString from 'query-string';
import axiosInstance from './axiosInstance';

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
          const text = new TextDecoder().decode(value);
          text.split('\n').forEach((line) => {
            if (!line) {
              return;
            }
            const json = JSON.parse(line);
            console.log('json', json);

            cb(json);
          });
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
    queryKey: ['/request_body', params],
    queryFn: async () => {
      const res = await axiosInstance.get(
        `/request_body?${queryString.stringify(params)}`,
        {
          responseType: 'arraybuffer',
        },
      );
      return res.data;
    },
    enabled: !!params.id,
  });
};

export const useGetResponseQuery = (params: { requestId?: number }) => {
  return useQuery({
    queryKey: ['/response', params],
    queryFn: async () => {
      const res = await axiosInstance.get(
        `/response?${queryString.stringify(params)}`,
      );
      return res.data as IResponseBoxView;
    },
    enabled: !!params.requestId,
  });
};

export const useGetResponseBodyQuery = (params: { requestId?: number }) => {
  return useQuery({
    queryKey: ['/response_body', params],
    queryFn: async () => {
      const res = await axiosInstance.get(
        `/response_body?${queryString.stringify(params)}`,
        {
          responseType: 'arraybuffer',
        },
      );
      return res.data;
    },
  });
};

export const useClearRequestLog = () => {
  const { message } = App.useApp();
  return useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post('/request/clear');
      return res.data;
    },
    onSuccess: () => {
      message.success('Request log cleared');
    },
  });
};
