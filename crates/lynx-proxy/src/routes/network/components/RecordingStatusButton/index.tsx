import {
  getGetCaptureStatusQueryKey,
  useGetCaptureStatus,
  useToggleCapture,
} from '@/services/generated/net-request/net-request';
import { RecordingStatus } from '@/services/generated/utoipaAxum.schemas';
import { RiPauseLargeFill, RiPlayLargeFill } from '@remixicon/react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface IRecordingStatusButtonProps { }

export const RecordingStatusButton: React.FC<
  IRecordingStatusButtonProps
> = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: netWorkCaptureStatusData } = useGetCaptureStatus();
  const toggleCapture = useToggleCapture({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetCaptureStatusQueryKey(),
          refetchType: 'active',
        });
      },
    },
  });
  const recordingStatus = netWorkCaptureStatusData?.data.recordingStatus;
  return (
    <Button
      onClick={async () => {
        await toggleCapture.mutateAsync();
      }}
      type="text"
      className={
        recordingStatus === RecordingStatus.pauseRecording
          ? 'bg-red-500 dark:bg-red-600  text-white dark:text-green-50'
          :
          'bg-emerald-500 dark:bg-emerald-600 text-white dark:text-green-50'
      }
      loading={toggleCapture.isPending}
      icon={
        recordingStatus === RecordingStatus.startRecording ? (
          <RiPlayLargeFill
            size={18}
            className="align-bottom"
          />
        ) : (
          <RiPauseLargeFill
            size={18}
            className="align-bottom"
          />
        )
      }
    >
      {recordingStatus === RecordingStatus.pauseRecording
        ? t('recording.stop')
        : t('recording.start')}
    </Button>
  );
};
