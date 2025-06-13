import React from 'react';
import { Button, Space, Typography, Card } from 'antd';
import { updateThemeColor, THEME_COLORS } from '@/utils/themeColor';

const { Title, Text } = Typography;

export const ThemeColorDemo: React.FC = () => {
  const handleSetLightTheme = () => {
    updateThemeColor('light');
  };

  const handleSetDarkTheme = () => {
    updateThemeColor('dark');
  };

  const handleSetCustomColor = (color: string) => {
    const themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    if (themeColorMeta) {
      themeColorMeta.content = color;
      console.log(`Custom theme color set to: ${color}`);
    }
  };

  return (
    <Card>
      <Title level={4}>动态主题颜色控制</Title>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Text strong>预设主题颜色:</Text>
          <br />
          <Space>
            <Button onClick={handleSetLightTheme}>
              亮色主题 ({THEME_COLORS.light})
            </Button>
            <Button onClick={handleSetDarkTheme}>
              暗色主题 ({THEME_COLORS.dark})
            </Button>
          </Space>
        </div>
        
        <div>
          <Text strong>自定义颜色:</Text>
          <br />
          <Space wrap>
            <Button 
              style={{ backgroundColor: '#ff4d4f' }}
              onClick={() => handleSetCustomColor('#ff4d4f')}
            >
              红色
            </Button>
            <Button 
              style={{ backgroundColor: '#52c41a' }}
              onClick={() => handleSetCustomColor('#52c41a')}
            >
              绿色
            </Button>
            <Button 
              style={{ backgroundColor: '#722ed1' }}
              onClick={() => handleSetCustomColor('#722ed1')}
            >
              紫色
            </Button>
            <Button 
              style={{ backgroundColor: '#fa8c16' }}
              onClick={() => handleSetCustomColor('#fa8c16')}
            >
              橙色
            </Button>
          </Space>
        </div>

        <div>
          <Text type="secondary">
            提示：点击上方按钮可以动态更改浏览器标题栏/地址栏的颜色。
            在支持的浏览器中，您会看到标题栏颜色的实时变化。
          </Text>
        </div>
      </Space>
    </Card>
  );
};
