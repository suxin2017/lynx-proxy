import React from 'react';
import { ModifyConfigBase } from './ModifyConfigBase';

interface ModifyRequestConfigProps {
    field: {
        key: number;
        name: number;
    };
}

export const ModifyRequestConfig: React.FC<ModifyRequestConfigProps> = ({ field }) => {
    return <ModifyConfigBase field={field} type="request" />;
};
