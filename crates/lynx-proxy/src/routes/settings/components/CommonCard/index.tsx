import { CardProps, Typography } from 'antd';

export const CommonCard: React.FC<
  CardProps & {
    subTitle?: string;
  }
> = ({ title, subTitle, children, extra, className }) => {
  return (
    <div
      className={`flex flex-1  overflow-auto rounded-xl border border-gray-300 px-4 py-4 dark:border-gray-500 ${className ? className : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <Typography.Title level={3} className="m-0">
            {title}
          </Typography.Title>
          <Typography.Title
            level={5}
            className="m-0 text-gray-500 dark:text-gray-400"
          >
            {subTitle}
          </Typography.Title>
        </div>
        {extra}
      </div>
      <div className='flex flex-1 '>
        {children}
      </div>
    </div>
  );
};
