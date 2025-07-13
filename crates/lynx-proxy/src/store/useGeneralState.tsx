import { useLocalStorageState } from 'ahooks';
import constate from 'constate';


export enum ConnectType {
  ShortPoll,
  SSE,
}

export const [GeneralSettingProvider, useGeneralSetting] = constate(() => {
  const [generalSetting, setGeneralSetting] = useLocalStorageState<{
    maxLogSize: number;
    connectType: ConnectType
  }>(
    'generalSetting',
    {
      defaultValue: {
        maxLogSize: 1000,
        connectType: ConnectType.ShortPoll,
      },
      serializer(value) {
        return JSON.stringify(value);
      },
      deserializer(value) {
        return JSON.parse(value);
      },
    },
  );

  return {
    ...generalSetting,
    generalSetting, setGeneralSetting
  };
});
