import { FilterOutlined } from '@ant-design/icons';
import { Button, Dropdown, MenuProps } from 'antd';
import React, { useEffect, useState } from 'react';
import { ActiveTemplatesTags } from './ActiveTemplatesTags';
import { useFilterTemplate } from './context';
import { FilterTemplateModal } from './FilterTemplateModal';

const FilterTemplateContent: React.FC = () => {
  const { state, openModal, toggleTemplateEnabled } = useFilterTemplate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleMenuClick: MenuProps['onClick'] = ({ key, domEvent }) => {
    // 阻止默认行为，防止下拉框关闭
    domEvent.stopPropagation();

    if (key === 'manage') {
      openModal();
      setDropdownOpen(false)
    } else {
      // 切换模板开启/关闭状态
      const template = state.templates.find(t => t.id === key);
      if (template) {
        toggleTemplateEnabled(template.id);
        console.log('切换模板状态:', template.name, !template.enabled);
      }
      // 切换模板状态时保持下拉框打开
    }
  };

  useEffect(() => {
    function cloneDropdownOpen() {
      setDropdownOpen(false);
    }

    document.body.addEventListener("click", cloneDropdownOpen);
    return () => {
      document.body.removeEventListener("click", cloneDropdownOpen);
    }
  }, [dropdownOpen])

  const menuItems: MenuProps['items'] = [
    {
      key: 'manage',
      label: '管理模板',
    },
    {
      type: 'divider',
    },
    ...(state.templates.length > 0 ? [
      {
        type: 'divider' as const,
      },
      ...state.templates.map(template => ({
        key: template.id,
        label: (
          <div className="flex items-center justify-between">
            <span className={template.enabled ? '' : 'text-gray-400'}>
              {template.name}
            </span>
            <span className={`ml-2 text-xs ${template.enabled ? 'text-green-600' : 'text-gray-400'
              }`}>
              {template.enabled ? '已开启' : '已关闭'}
            </span>
          </div>
        ),
      }))
    ] : [])
  ];

  return (
    <>
      <Dropdown
        menu={{
          items: menuItems,
          onClick: handleMenuClick,
          selectable: false,
        }}
        open={dropdownOpen}
      >
        <Button onClick={(e) => {
          e.stopPropagation();
          setDropdownOpen(true);
        }} className="flex items-center">
          <FilterOutlined className="mr-1" />
          过滤模板
        </Button>
      </Dropdown>
      <FilterTemplateModal />
    </>
  );
};

export const FilterTemplate: React.FC = () => {
  return <FilterTemplateContent />;
};

export { ActiveTemplatesTags };
