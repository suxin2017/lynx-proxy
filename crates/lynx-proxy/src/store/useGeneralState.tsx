import constate from 'constate';
import { useGetGeneralSetting } from '@/services/generated/general-setting/general-setting';

export enum ConnectType {
  ShortPoll = '0',
  SSE = '1',
}

export const [GeneralSettingProvider, useGeneralSetting] = constate(() => {
  const { data: generalSettingResponse, isLoading } = useGetGeneralSetting();
  
  const generalSetting = generalSettingResponse?.data || {
    maxLogSize: 1000,
    connectType: ConnectType.ShortPoll,
    language: 'en'
  };



  return {
    ...generalSetting,
    generalSetting,
    isLoading,
  };
});
