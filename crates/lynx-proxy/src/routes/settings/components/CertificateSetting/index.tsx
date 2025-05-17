import { Alert, Button, Input, QRCode, Space, Typography, message } from 'antd';
import { CommonCard } from '../CommonCard';
import {
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiFileCopyLine,
  RiShieldLine,
} from '@remixicon/react';
import { useGetHealth } from '@/services/generated/default/default';
import {
  getDownloadCertificateQueryKey,
  useGetCertPath,
} from '@/services/generated/certificate/certificate';
import { CertInstallDesc } from './CertInstallDesc';
import { AXIOS_INSTANCE } from '@/services/customInstance';
import { useTranslation } from 'react-i18next';

export const CertificatesSetting: React.FC = () => {
  const { t } = useTranslation();
  const { data, refetch } = useGetHealth();
  const { data: certPathData } = useGetCertPath();

  return (
    <CommonCard
      title={t('settings.certificate.title')}
      subTitle={t('settings.certificate.subtitle')}
    >
      {data === 'ok' ? (
        <Alert
          type="success"
          className="mt-3"
          icon={<RiCheckboxCircleLine className="h-6" size={18} />}
          description={
            <>
              <Typography.Title level={4} className="m-0">
                {t('settings.certificate.installed.title')}
              </Typography.Title>
              <Typography.Text strong>
                {t('settings.certificate.installed.description')}
              </Typography.Text>
            </>
          }
          showIcon
        />
      ) : (
        <Alert
          type="error"
          className="mt-3"
          icon={<RiCloseCircleLine className="h-6" size={18} />}
          description={
            <>
              <Typography.Title level={4} className="m-0">
                {t('settings.certificate.notInstalled.title')}
              </Typography.Title>
              <Typography.Text strong>
                {t('settings.certificate.notInstalled.description')}
              </Typography.Text>
            </>
          }
          showIcon
        />
      )}
      <Typography.Title level={4} className="mt-3">
        {t('settings.certificate.certPath')}
      </Typography.Title>
      <Space size={8}>
        <Input size="large" value={certPathData?.data} disabled />
        <Button
          size="large"
          icon={<RiFileCopyLine size={16} />}
          onClick={() => {
            if (certPathData?.data) {
              navigator.clipboard.writeText(certPathData.data);
              message.success(t('settings.certificate.copySuccess'));
            }
          }}
        />
        <Button
          size="large"
          onClick={() => {
            refetch();
          }}
          icon={<RiShieldLine size={16} />}
        >
          {t('settings.certificate.checkStatus')}
        </Button>
      </Space>
      <Typography.Title level={4} className="mt-3">
        {t('settings.certificate.installCert')}
      </Typography.Title>
      <Space size={8} direction="vertical" className="flex w-full items-center">
        <QRCode
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
    </CommonCard>
  );
};
