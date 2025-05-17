import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IAppConfigModel,
  IAppConfigResponse,
  RecordStatusEnum,
} from './models';
import { App } from 'antd';
import axiosInstance from './axiosInstance';

import { SaveGeneralConfigParams } from '@/SaveGeneralConfigParams';
import { GetAppConfigResponse } from '@/GetAppConfigResponse';
import { SaveGeneralConfigResponse } from '@/SaveGeneralConfigResponse';

export const useGetAppConfig = () => {
  return useQuery({
    queryKey: ['/app_config'],
    queryFn: async () => {
      const response =
        await axiosInstance.get<GetAppConfigResponse>('/app_config');
      return response.data;
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

export const useSaveGeneralConfig = () => {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: async (config: SaveGeneralConfigParams) => {
      const response = await axiosInstance.post<SaveGeneralConfigResponse>(
        '/general_config/save',
        config,
      );
      return response.data;
    },
    onSuccess: () => {
      message.success('Save successfully');
      queryClient.invalidateQueries({
        queryKey: ['/app_config'],
      });
    },
  });
};
