import React, { useState } from 'react';
import { Button, Dropdown, Checkbox, Space, theme } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { useCustomColumnContext } from './hook';
import type { MenuProps } from 'antd';
import { DropdownProps } from 'antd/lib';

const CustomColumn: React.FC = () => {
    const { token } = theme.useToken();
    const [open, setOpen] = useState(false);

    const contentStyle: React.CSSProperties = {
        backgroundColor: token.colorBgContainer,
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadowSecondary,
    };
    const { columns, customColumns, setColumnsKey } = useCustomColumnContext();

    const selectedKeys = customColumns.map(col => col.key);

    const handleColumnChange = (columnKey: string, checked: boolean) => {
        if (checked) {
            setColumnsKey([...selectedKeys, columnKey]);
        } else {
            setColumnsKey(selectedKeys.filter(key => key !== columnKey));
        }
    };

    const handleSelectAll = () => {
        const allKeys = columns.map(col => col.key);
        setColumnsKey(allKeys);
    };

    const handleClearAll = () => {
        setColumnsKey([]);
    };

    const menuItems: MenuProps['items'] = columns.map(column => ({
        key: column.key,
        label: (
            <Checkbox
                checked={selectedKeys.includes(column.key)}
                onChange={(e) => handleColumnChange(column.key, e.target.checked)}
            >
                {column.title}
            </Checkbox>
        ),
    }));
    const handleOpenChange: DropdownProps['onOpenChange'] = (nextOpen, info) => {
        if (info.source === 'trigger' || nextOpen) {
            setOpen(nextOpen);
        }
    };


    return (
        <Dropdown
            onOpenChange={handleOpenChange}
            open={open}
            menu={{ items: menuItems }}
            trigger={['click']}
            dropdownRender={(menu) => (
                <div className='flex flex-col' style={contentStyle}>
                    {React.cloneElement(
                        menu as React.ReactElement<{
                            style: React.CSSProperties;
                        }>,
                        { style: { boxShadow: 'none', } },
                    )}

                    <Space className='w-full flex justify-around p-1' >
                        <Button className='text-center' type="text" size="small" onClick={handleSelectAll}>
                            全选
                        </Button>
                        <Button className='text-center' type="text" size="small" onClick={handleClearAll}>
                            清空
                        </Button>
                    </Space>
                </div>
            )}
        >
            <Button icon={<SettingOutlined />}>
                自定义列
            </Button>
        </Dropdown>
    );
};

export default CustomColumn;
