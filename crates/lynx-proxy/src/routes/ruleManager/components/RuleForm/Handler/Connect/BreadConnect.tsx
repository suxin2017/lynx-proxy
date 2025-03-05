import { Switch, SwitchProps } from "antd";
import React from "react";

export const BreadkConnect: React.FC<SwitchProps> = (props) => {
    return (
        <Switch className="w-8" size="small" {...props} />
    )
}