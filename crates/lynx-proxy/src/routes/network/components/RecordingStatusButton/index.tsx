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

interface IRecordingStatusButtonProps {}

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
      type="text"
      onClick={async () => {
        await toggleCapture.mutateAsync();
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
            className="align-bottom text-red-400 dark:text-red-500"
          />
        )
      }
      title={
        recordingStatus === RecordingStatus.startRecording
          ? t('recording.stop')
          : t('recording.start')
      }
    ></Button>
  );
};
