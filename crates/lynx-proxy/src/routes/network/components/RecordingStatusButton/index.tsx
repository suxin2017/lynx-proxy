import React from 'react';
import { RiRecordCircleFill } from '@remixicon/react';
import { Button } from 'antd';
import { useChangeRecordStatus, useGetAppConfig } from '@/api/app';
import { RecordStatusEnum } from '@/api/models';

interface IRecordingStatusButtonProps {}

export const RecordingStatusButton: React.FC<
  IRecordingStatusButtonProps
> = () => {
  const { data: appConfigData } = useGetAppConfig();
  const changeRecordStatus = useChangeRecordStatus();

  const recordingStatus = appConfigData?.data?.recordingStatus;
  return (
    <div>
      <Button
        type="text"
        size='small'
        onClick={() => {
          if (recordingStatus === RecordStatusEnum.StartRecording) {
            changeRecordStatus.mutateAsync({
              status: RecordStatusEnum.PauseRecording,
            });
          } else {
            changeRecordStatus.mutateAsync({
              status: RecordStatusEnum.StartRecording,
            });
          }
        }}
        icon={
          <RiRecordCircleFill
            size={16}
            color={
              recordingStatus === RecordStatusEnum.StartRecording
                ? 'red'
                : 'gray'
            }
          />
        }
        title={
          recordingStatus === RecordStatusEnum.StartRecording
            ? 'Stop Recording'
            : 'Start Recording'
        }
      >
        {recordingStatus === RecordStatusEnum.StartRecording
          ? 'Recording'
          : 'Paused'}
      </Button>
    </div>
  );
};
