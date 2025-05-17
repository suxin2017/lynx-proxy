import { Card, CardProps, Typography } from 'antd';

export const CommonCard: React.FC<
  CardProps & {
    subTitle?: string;
  }
> = ({ title, subTitle, children }) => {
  return (
    <div className="rounded-xl border px-4 py-4">
      <Typography.Title level={3} className="m-0">
        {title}
      </Typography.Title>
      <Typography.Title
        level={5}
        className="derk:text-gray-400 m-0 text-gray-500"
      >
        {subTitle}
      </Typography.Title>
      {children}
    </div>
  );
};
