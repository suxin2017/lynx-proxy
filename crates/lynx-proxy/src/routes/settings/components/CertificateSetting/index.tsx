import { AXIOS_INSTANCE } from '@/services/customInstance';
import {
  getDownloadCertificateQueryKey,
  useGetCertPath,
} from '@/services/generated/certificate/certificate';
import {
  RiFileCopyLine
} from '@remixicon/react';
import { Button, Input, QRCode, Space, Typography, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { CommonCard } from '../CommonCard';
import { CertInstallDesc } from './CertInstallDesc';

export const CertificatesSetting: React.FC = () => {
  const { t } = useTranslation();
  const { data: certPathData } = useGetCertPath();

  return (
    <CommonCard
      className='flex-col'
      title={t('settings.certificate.title')}
      subTitle={t('settings.certificate.subtitle')}
    >
      <div className="flex flex-1 flex-col">
        <Typography.Title level={5} className="mt-3">
          {t('settings.certificate.certPath')}
        </Typography.Title>
        <div className="flex  items-center gap-4">
          <Input className="flex-1" value={certPathData?.data} disabled />
          <Button
            icon={<RiFileCopyLine size={16} />}
            onClick={() => {
              if (certPathData?.data) {
                navigator.clipboard.writeText(certPathData.data);
                message.success(t('settings.certificate.copySuccess'));
              }
            }}
          />
        </div>
        <Typography.Title level={5} className="mt-3">
          {t('settings.certificate.installCert')}
        </Typography.Title>
        <Space size={8} direction="vertical" className="flex  items-center">
          <QRCode
            size={256}
            value={AXIOS_INSTANCE.getUri() + getDownloadCertificateQueryKey()[0]}
          />
          <Button type="link">
            <a
              href={AXIOS_INSTANCE.getUri() + getDownloadCertificateQueryKey()[0]}
              download
            >
              {t('settings.certificate.downloadCert')}
            </a>
          </Button>
        </Space>
        <CertInstallDesc />
      </div>
    </CommonCard>
  );
};
