import { useLocalStorageState } from 'ahooks';
import constate from 'constate';

export const [GeneralSettingProvider, useGeneralSetting] = constate(() => {
  const [maxLogSize, setMaxLogSize] = useLocalStorageState<number>(
    'maxLogSize',
    {
      defaultValue: 1000,
      serializer(value) {
        return value.toString();
      },
      deserializer(value) {
        return parseInt(value, 10);
      },
    },
  );

  return {
    maxLogSize,
    setMaxLogSize,
  };
});
