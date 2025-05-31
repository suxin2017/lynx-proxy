import { Typography } from 'antd';
import React, { useState } from 'react';
import { HandlerItem } from './HandlerItem';

const { Text } = Typography;

interface HandlerListProps {
    fields: Array<{
        key: number;
        name: number;
    }>;
    remove: (index: number) => void;
}

export const HandlerList: React.FC<HandlerListProps> = ({ fields, remove }) => {
    const [editingHandler, setEditingHandler] = useState<number | null>(null);


    if (fields.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <Text type="secondary">暂无处理器，点击下方按钮添加处理器</Text>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {fields.map((field, index) => (
                <div
                    key={field.key}
                    className={`transition-all duration-200`}
                >
                    <HandlerItem
                        field={field}
                        index={index}
                        isEditing={editingHandler === field.name}
                        onEdit={() => setEditingHandler(field.name)}
                        onSave={() => setEditingHandler(null)}
                        onCancel={() => setEditingHandler(null)}
                        onDelete={() => remove(field.name)}
                    />
                </div>
            ))}
        </div>
    );
};
