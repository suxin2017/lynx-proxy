import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IAppConfigModel,
  IAppConfigResponse,
  IRuleGroupTreeResponse as IRuleGroupTreeResponse,
  RecordStatusEnum,
} from './models';
import { message } from 'antd';

export const useChangeRecordStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ status }: { status: RecordStatusEnum }) =>
      fetch(`/__self_service_path__/app_config/record_status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      }).then((res) => res.json() as Promise<IRuleGroupTreeResponse>),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/__self_service_path__/app_config'],
      });
    },
  });
};

export const useGetAppConfig = () => {
  return useQuery({
    queryKey: ['/__self_service_path__/app_config'],
    queryFn: async () =>
      fetch(`/__self_service_path__/app_config`).then(
        (res) => res.json() as Promise<IAppConfigResponse>,
      ),
  });
};

export const useSaveSSLConfig = () => {
  return useMutation({
    mutationFn: async (
      config: IAppConfigModel['sslConfig'] & { captureSSL: boolean },
    ) =>
      fetch(`/__self_service_path__/ssl_config/save`, {
        method: 'POST',
        body: JSON.stringify(config),
      }).then((res) => res.json()),
    onSuccess: () => {
      message.success('Save successfully');
    },
  });
};
