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
import { useGetBaseInfo } from '@/services/generated/system/system';

export const CertificatesSetting: React.FC = () => {
  const { t } = useTranslation();
  const { data: certPathData } = useGetCertPath();
  const { data } = useGetBaseInfo();


  return (
    <CommonCard
      className='flex-col'
      title={t('settings.certificate.title')}
      subTitle={t('settings.certificate.subtitle')}
    >
      <div className="flex flex-1 flex-col w-full">
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

        <div className='flex w-full overflow-auto gap-4 justify-between'>

          {data?.map((item) => {
            const certUrl = "http://" + item + AXIOS_INSTANCE.getUri() + getDownloadCertificateQueryKey()[0];

            return (
              <Space size={8} direction="vertical" className="flex items-center">
                <QRCode
                  size={256}
                  value={certUrl}
                />
                <Button type="link">
                  <a
                    href={certUrl}
                    download
                  >
                    {t('settings.certificate.downloadCert')}
                  </a>
                </Button>
                <a href={certUrl}>
                  {certUrl}
                </a>
              </Space>
            )
          })}
        </div>
        <CertInstallDesc />
      </div>
    </CommonCard>
  );
};
