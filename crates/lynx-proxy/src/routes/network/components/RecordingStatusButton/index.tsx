import {
  useGetCaptureStatus,
  useToggleCapture,
} from '@/services/generated/net-request/net-request';
import { RecordingStatus } from '@/services/generated/utoipaAxum.schemas';
import {
  RiPauseCircleFill,
  RiPauseLargeFill,
  RiPlayCircleFill,
  RiPlayLargeFill,
} from '@remixicon/react';
import { Button } from 'antd';
import React from 'react';

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
          <RiPlayLargeFill
            size={18}
            className="align-bottom text-emerald-500 dark:text-emerald-400"
          />
        ) : (
          <RiPauseLargeFill
            size={18}
            className="align-bottom text-gray-400 dark:text-gray-500"
          />
        )
      }
      title={
        recordingStatus === RecordingStatus.startRecording
          ? 'Stop Recording'
          : 'Start Recording'
      }
    ></Button>
  );
};
