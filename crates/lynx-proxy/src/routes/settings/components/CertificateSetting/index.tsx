import { Alert, Button, Input, Space, Typography } from 'antd';
import { CommonCard } from '../CommonCard';
import {
  RiCopyleftLine,
  RiFileCopy2Line,
  RiFileCopyLine,
  RiShieldLine,
} from '@remixicon/react';

export const CertificatesSetting: React.FC = () => {
  return (
    <CommonCard title="证书管理" subTitle="管理HTTPS抓包所需的SSL证书">
      <Alert
        type="error"
        className="mt-3"
        description={
          <>
            <Typography.Title level={4} className="m-0">
              需要安装证书才能抓取HTTPS请求
            </Typography.Title>
            <Typography.Text strong>
              要抓取HTTPS请求，您需要在系统或浏览器中安装并信任此证书。
            </Typography.Text>
          </>
        }
        showIcon
      />
      <Typography.Title level={5} className="mt-3">
        证书路径
      </Typography.Title>
      <Space>
        <Input size="large" value={'./certs/ca.crt'} disabled />
        <Button size="large" icon={<RiFileCopyLine size={16} />} />
        <Button size="large" icon={<RiShieldLine size={16} />}>
          检查状态
        </Button>
      </Space>
    </CommonCard>
  );
};
