import React, { useState, useCallback, useMemo } from 'react';
import { Card, Button, Select, Typography, Tooltip, Badge, Collapse } from 'antd';
import { PlusOutlined, DeleteOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import {
    ComplexCaptureRule as ComplexCaptureRuleType,
    CaptureCondition,
    CaptureConditionOneOf,
    CaptureConditionOneOfFour,
    LogicalOperator,
    SimpleCaptureCondition as SimpleCaptureConditionType
} from '@/services/generated/utoipaAxum.schemas';
import { SimpleCaptureCondition } from './SimpleCaptureCondition';
import { RiAddLine, RiApps2AddLine } from '@remixicon/react';

const { Text } = Typography;
const { Option } = Select;

// 逻辑操作符配置
const operatorConfig = {
    and: {
        label: 'AND',
        description: '所有条件都必须满足',
        color: 'text-green-600',
        bgColor: 'bg-green-100'
    },
    or: {
        label: 'OR',
        description: '任一条件满足即可',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
    },
    not: {
        label: 'NOT',
        description: '条件不满足时匹配（只能配置一个条件）',
        color: 'text-red-600',
        bgColor: 'bg-red-100'
    }
};

// 规则预览组件
const RulePreview: React.FC<{ rule: ComplexCaptureRuleType; depth?: number }> = ({ rule, depth = 0 }) => {
    const renderCondition = (condition: CaptureCondition, index: number): React.ReactNode => {
        // 简单条件：包含 urlPattern, method, host, headers 但没有 operator, conditions
        if ('urlPattern' in condition && !('operator' in condition)) {
            const simpleCondition = condition as CaptureConditionOneOf;
            const urlPattern = simpleCondition.urlPattern;
            return (
                <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                    <Text>URL: {urlPattern?.pattern || '未设置'} ({urlPattern?.captureType || 'glob'})</Text>
                    {simpleCondition.method && <Text className="block">Method: {simpleCondition.method}</Text>}
                    {simpleCondition.host && <Text className="block">Host: {simpleCondition.host}</Text>}
                </div>
            );
        }
        // 复杂条件：包含 operator 和 conditions
        else if ('operator' in condition && 'conditions' in condition) {
            const complexCondition = condition as CaptureConditionOneOfFour;
            return (
                <div key={index} className="ml-4 border-l-2 border-gray-300 pl-4">
                    <RulePreview rule={complexCondition} depth={depth + 1} />
                </div>
            );
        }
        return null;
    };

    const config = operatorConfig[rule.operator];

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Badge
                    count={config.label}
                    className={`${config.bgColor} ${config.color} font-bold text-xs`}
                />
                <Text strong className={config.color}>{config.label}</Text>
                <Text type="secondary" className="text-xs">({config.description})</Text>
            </div>
            <div className="space-y-2">
                {rule.conditions.map(renderCondition)}
            </div>
        </div>
    );
};

// 条件编辑组件
const ConditionEditor = React.memo<{
    condition: CaptureCondition;
    onChange: (condition: CaptureCondition) => void;
    onRemove: () => void;
    depth: number;
    index: number;
}>(({ condition, onChange, onRemove, depth, index }) => {

    const handleConditionTypeChange = useCallback((type: 'simple' | 'complex') => {
        if (type === 'simple') {
            onChange({
                type: 'simple',
                urlPattern: undefined,
                method: undefined,
                host: undefined,
                headers: undefined
            } as CaptureConditionOneOf);
        } else {
            onChange({
                type: 'complex',
                operator: 'and',
                conditions: []
            } as CaptureConditionOneOfFour);
        }
    }, [onChange]);

    // 简单条件：包含 urlPattern 但没有 operator
    const isSimple = 'urlPattern' in condition && !('operator' in condition);
    // 复杂条件：包含 operator 和 conditions
    const isComplex = 'operator' in condition && 'conditions' in condition;

    return (
        <Card
            size="small"
            className={`border-2 relative`}
        >
            {/* 连接线 */}
            {depth > 0 && (
                <div className="absolute -left-2 top-1/2 w-2 h-px bg-gray-300" />
            )}

            <div className="flex justify-between items-start mb-3">
                <Text strong className={`text-sm`}>
                    条件 {index + 1}
                </Text>
                <div className="flex items-center gap-1">
                    {isComplex && (
                        <>
                            <Button
                                type="text"
                                size="small"
                                icon={<RiAddLine />}
                                disabled={condition.conditions.length >= 1 && condition.operator === 'not'}
                                onClick={() => {
                                    const complexCondition = condition as ComplexCaptureRuleType;
                                    const newSimpleCondition: CaptureCondition = {
                                        type: 'simple',
                                        urlPattern: undefined,
                                        method: undefined,
                                        host: undefined,
                                        headers: undefined
                                    } as CaptureConditionOneOf;
                                    onChange({
                                        ...complexCondition,
                                        conditions: [...complexCondition.conditions, newSimpleCondition]
                                    } as CaptureConditionOneOfFour);
                                }}
                                title="添加简单条件"
                            />
                            <Button
                                type="text"
                                disabled={condition.conditions.length >= 1 && condition.operator === 'not'}
                                size="small"
                                icon={<RiApps2AddLine />}

                                onClick={() => {
                                    const complexCondition = condition as ComplexCaptureRuleType;
                                    const newComplexCondition: CaptureCondition = {
                                        type: 'complex',
                                        operator: 'and',
                                        conditions: []
                                    } as CaptureConditionOneOfFour;
                                    onChange({
                                        ...complexCondition,
                                        conditions: [...complexCondition.conditions, newComplexCondition]
                                    } as CaptureConditionOneOfFour);
                                }}
                                title="添加复杂条件"
                            />
                        </>
                    )}
                    <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={onRemove}
                        className="text-red-500 hover:text-red-700"
                        title="删除条件"
                    />
                </div>
            </div>

            {isSimple && (
                <SimpleCaptureCondition
                    value={condition as SimpleCaptureConditionType}
                    onChange={useCallback((value: SimpleCaptureConditionType) => onChange({ ...value, type: 'simple' } as CaptureConditionOneOf), [onChange])}
                />
            )}

            {isComplex && (
                <ComplexCaptureRule
                    value={condition as ComplexCaptureRuleType}
                    onChange={useCallback((value: ComplexCaptureRuleType) => onChange({ ...value, type: 'complex' } as CaptureConditionOneOfFour), [onChange])}
                    depth={depth + 1}
                />
            )}
        </Card>
    );
});

// 操作符选择组件
const OperatorSelector = React.memo(({ operator, onChange, config, depth }: {
    operator: LogicalOperator;
    onChange: (op: LogicalOperator) => void;
    config: typeof operatorConfig[LogicalOperator];
    depth: number;
}) => (
    depth === 0 ? (
        <div className="flex items-center gap-2">
            <Text strong>逻辑操作符：</Text>
            <Select
                value={operator}
                onChange={onChange}
                className="w-32"
            >
                {Object.entries(operatorConfig).map(([key, conf]) => (
                    <Option key={key} value={key}>
                        <div className="flex items-center gap-2">
                            <span className={`font-bold ${conf.color}`}>{conf.label}</span>
                        </div>
                    </Option>
                ))}
            </Select>
            <Tooltip title={config.description}>
                <QuestionCircleOutlined className={config.color} />
            </Tooltip>
        </div>
    ) : (
        <div className="flex items-center gap-2 mb-3">
            <Select
                value={operator}
                onChange={onChange}
                className="w-24"
            >
                {Object.entries(operatorConfig).map(([key, conf]) => (
                    <Option key={key} value={key}>
                        <div className="flex items-center gap-1">
                            <span className={`font-bold ${conf.color} text-xs`}>{conf.label}</span>
                        </div>
                    </Option>
                ))}
            </Select>
            <Text type="secondary" className="text-xs">({config.description})</Text>
        </div>
    )
));

// 条件列表组件
const ConditionList = React.memo(({ conditions, updateCondition, removeCondition, depth }: {
    conditions: CaptureCondition[];
    updateCondition: (index: number, c: CaptureCondition) => void;
    removeCondition: (index: number) => void;
    depth: number;
}) => (
    <div className="space-y-3">
        {conditions.map((condition, index) => {
            const isSimple = 'urlPattern' in condition && !('operator' in condition);
            const conditionType = isSimple ? 'simple' : 'complex';
            const conditionKey = `${conditionType}-${index}`;
            return (
                <ConditionEditor
                    key={conditionKey}
                    condition={condition}
                    onChange={(newCondition) => updateCondition(index, newCondition)}
                    onRemove={() => removeCondition(index)}
                    depth={depth}
                    index={index}
                />
            );
        })}
    </div>
));

// 添加条件按钮组件
const AddConditionButtons = React.memo(({ onAddSimple, onAddComplex, disabled }: {
    onAddSimple: () => void;
    onAddComplex: () => void;
    disabled: boolean;
}) => (
    <div className="flex gap-2">
        <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={onAddSimple}
            className="flex-1"
            disabled={disabled}
        >
            添加简单条件
        </Button>
        <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={onAddComplex}
            className="flex-1"
            disabled={disabled}
        >
            添加复杂条件
        </Button>
    </div>
));

// NOT 操作符提示组件
const NotOperatorTip = React.memo(() => (
    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
        <Text type="secondary" className="text-sm">
            ℹ️ NOT 操作符只能配置一个条件。当有多个条件时，会自动只保留第一个条件。
        </Text>
    </div>
));

// 空状态提示组件
const EmptyState = React.memo(() => (
    <div className="text-center p-8 bg-gray-50 rounded border-2 border-dashed border-gray-300">
        <Text type="secondary">
            还没有添加任何条件<br />
            点击上方按钮开始构建复杂规则
        </Text>
    </div>
));

// 修正 ComplexCaptureRuleProps 类型声明
interface ComplexCaptureRuleProps {
    value?: ComplexCaptureRuleType;
    onChange?: (value: ComplexCaptureRuleType) => void;
    depth?: number;
}

// 主组件
export const ComplexCaptureRule = React.memo(({
    value = { operator: 'and', conditions: [] },
    onChange,
    depth = 0
}: ComplexCaptureRuleProps) => {
    const [previewActive, setPreviewActive] = useState(false);
    const config = useMemo(() => operatorConfig[value.operator as LogicalOperator], [value.operator]);

    const handleOperatorChange = useCallback((operator: LogicalOperator) => {
        let newConditions = value.conditions;

        // NOT 操作符只能有一个条件
        if (operator === 'not' && value.conditions.length > 1) {
            newConditions = [value.conditions[0]]; // 只保留第一个条件
        }

        onChange?.({ ...value, operator, conditions: newConditions });
    }, [value, onChange]);

    const addCondition = useCallback((type: 'simple' | 'complex' = 'simple') => {
        // NOT 操作符只能有一个条件
        if (value.operator === 'not' && value.conditions.length >= 1) {
            return;
        }

        const newCondition: CaptureCondition = type === 'simple'
            ? {
                type: 'simple',
                urlPattern: undefined,
                method: undefined,
                host: undefined,
                headers: undefined
            } as CaptureConditionOneOf
            : {
                type: 'complex',
                operator: 'and',
                conditions: []
            } as CaptureConditionOneOfFour;

        onChange?.({
            ...value,
            conditions: [...value.conditions, newCondition]
        });
    }, [value, onChange]);

    const updateCondition = useCallback((index: number, condition: CaptureCondition) => {
        const newConditions = [...value.conditions];
        newConditions[index] = condition;
        onChange?.({ ...value, conditions: newConditions });
    }, [value, onChange]);

    const removeCondition = useCallback((index: number) => {
        const newConditions = value.conditions.filter((_, i) => i !== index);
        onChange?.({ ...value, conditions: newConditions });
    }, [value, onChange]);

    return (
        <div className="space-y-4">
            {/* 操作符选择 */}
            <OperatorSelector operator={value.operator as LogicalOperator} onChange={handleOperatorChange} config={config} depth={depth} />
            {/* 规则预览折叠面板 */}
            {depth === 0 && (
                <Collapse
                    activeKey={previewActive ? ['preview'] : []}
                    onChange={keys => setPreviewActive((keys as string[]).includes('preview'))}
                    className="mb-2"
                >
                    <Collapse.Panel header={<span className="text-blue-600 font-bold">规则预览</span>} key="preview">
                        <RulePreview rule={value} />
                    </Collapse.Panel>
                </Collapse>
            )}
            {/* 条件列表 */}
            <ConditionList conditions={value.conditions} updateCondition={updateCondition} removeCondition={removeCondition} depth={depth} />
            {/* 添加条件按钮 */}
            {depth === 0 && <AddConditionButtons onAddSimple={() => addCondition('simple')} onAddComplex={() => addCondition('complex')} disabled={value.operator === 'not' && value.conditions.length >= 1} />}
            {/* 空状态提示 */}
            {value.conditions.length === 0 && <EmptyState />}
            {/* NOT 操作符特殊提示 */}
            {value.operator === 'not' && <NotOperatorTip />}

        </div>
    );
});