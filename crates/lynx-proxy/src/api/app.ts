import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IAppConfigModel,
  IAppConfigResponse,
  RecordStatusEnum,
} from './models';
import { App } from 'antd';
import axiosInstance from './axiosInstance';

export const useChangeRecordStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ status }: { status: RecordStatusEnum }) => {
      const response = await axiosInstance.post('/app_config/record_status', { status });
      return response.data as IAppConfigResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/app_config'],
      });
    },
  });
};

export const useGetAppConfig = () => {
  return useQuery({
    queryKey: ['/app_config'],
    queryFn: async () => {
      const response = await axiosInstance.get('/app_config');
      return response.data as IAppConfigResponse;
    },
  });
};

export const useSaveSSLConfig = () => {
  const { message } = App.useApp();
  return useMutation({
    mutationFn: async (
      config: IAppConfigModel['sslConfig'] & { captureSSL: boolean },
    ) => {
      const response = await axiosInstance.post('/ssl_config/save', config);
      return response.data;
    },
    onSuccess: () => {
      message.success('Save successfully');
    },
  });
};
