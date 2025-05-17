import { Card, CardProps, Typography } from 'antd';

export const CommonCard: React.FC<
  CardProps & {
    subTitle?: string;
  }
> = ({ title, subTitle, children }) => {
  return (
    <div className="rounded-xl border border-gray-300 px-4 py-4 dark:border-gray-500">
      <Typography.Title level={3} className="m-0">
        {title}
      </Typography.Title>
      <Typography.Title
        level={5}
        className="m-0 text-gray-500 dark:text-gray-400"
      >
        {subTitle}
      </Typography.Title>
      {children}
    </div>
  );
};
