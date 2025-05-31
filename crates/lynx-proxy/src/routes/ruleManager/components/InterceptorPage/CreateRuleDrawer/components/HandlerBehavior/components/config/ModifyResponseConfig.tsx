import React from 'react';
import { ModifyConfigBase } from './ModifyConfigBase';

interface ModifyResponseConfigProps {
    field: {
        key: number;
        name: number;
    };
}

export const ModifyResponseConfig: React.FC<ModifyResponseConfigProps> = ({ field }) => {
    return <ModifyConfigBase field={field} type="response" />;
};
