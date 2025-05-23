import { RiComputerLine } from '@remixicon/react';
import { Segmented, Space, Typography, Steps } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type Platform = 'windows' | 'macos' | 'mobile';

export const CertInstallDesc = () => {
  const { t } = useTranslation();
  const [platform, setPlatform] = useState<Platform>('windows');

  const getSteps = (platform: Platform) => {
    return Array.from({ length: platform === 'mobile' ? 3 : 4 }, (_, i) => ({
      title: t(`settings.certificate.install.${platform}.step${i + 1}.title`),
      description: t(
        `settings.certificate.install.${platform}.step${i + 1}.description`,
      ),
    }));
  };

  return (
    <Space direction="vertical" size="large" className="w-full">
      <Segmented
        block
        value={platform}
        onChange={(value) => setPlatform(value as Platform)}
        options={[
          {
            label: (
              <Space>
                <RiComputerLine className="align-middle" size={16} />
                <span>
                  {t('settings.certificate.install.platform.windows')}
                </span>
              </Space>
            ),
            value: 'windows',
          },
          {
            label: (
              <Space>
                <RiComputerLine className="align-middle" size={16} />
                <span>{t('settings.certificate.install.platform.macos')}</span>
              </Space>
            ),
            value: 'macos',
          },
          {
            label: (
              <Space>
                <RiComputerLine className="align-middle" size={16} />
                <span>{t('settings.certificate.install.platform.linux')}</span>
              </Space>
            ),
            value: 'linux',
          },
          {
            label: (
              <Space>
                <RiComputerLine className="align-middle" size={16} />
                <span>{t('settings.certificate.install.platform.mobile')}</span>
              </Space>
            ),
            value: 'mobile',
          },
        ]}
      />
      <div>
        <Typography.Title level={5} className="m-0">
          {t('settings.certificate.install.title')}
        </Typography.Title>
        <Steps
          direction="vertical"
          size="small"
          items={getSteps(platform)}
          className="mt-4"
        />
      </div>
    </Space>
  );
};
