import React from 'react';
import {
  RiPauseCircleFill,
  RiPauseFill,
  RiPlayCircleFill,
  RiPlayFill,
  RiRecordCircleFill,
} from '@remixicon/react';
import { Button } from 'antd';
import { useChangeRecordStatus, useGetAppConfig } from '@/api/app';
import { RecordStatusEnum } from '@/api/models';
import {
  useGetCaptureStatus,
  useToggleCapture,
} from '@/services/generated/net-request/net-request';
import { RecordingStatus } from '@/services/generated/utoipaAxum.schemas';

interface IRecordingStatusButtonProps {}

export const RecordingStatusButton: React.FC<
  IRecordingStatusButtonProps
> = () => {
  const { data: netWorkCaptureStatusData, refetch } = useGetCaptureStatus();
  const toggleCapture = useToggleCapture();
  const recordingStatus = netWorkCaptureStatusData?.data.recordingStatus;
  return (
    <Button
      type="text"
      onClick={async () => {
        await toggleCapture.mutateAsync();
        await refetch();
      }}
      icon={
        recordingStatus === RecordingStatus.startRecording ? (
          <RiPlayCircleFill
            size={16}
            className="align-bottom text-emerald-500 dark:text-emerald-400"
          />
        ) : (
          <RiPauseCircleFill
            size={16}
            className="align-bottom text-gray-400 dark:text-gray-500"
          />
        )
      }
      title={
        recordingStatus === RecordingStatus.startRecording
          ? 'Stop Recording'
          : 'Start Recording'
      }
    >
      {recordingStatus === RecordingStatus.startRecording
        ? 'Recording'
        : 'Paused'}
    </Button>
  );
};
