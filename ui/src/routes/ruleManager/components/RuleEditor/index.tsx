import React, { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import {
  useGetRuleDetailQuery,
  useRuleContextSchema,
  useUpdateRule,
} from '@/api/rule';
import { useSelectedRuleContext } from '../store';
import { Button, Empty, message } from 'antd';
import { RiSaveLine } from '@remixicon/react';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
self.MonacoEnvironment = {
  getWorker: function (_moduleId, label) {
    if (label === 'json') {
      return new Worker(
        new URL(
          'monaco-editor/esm/vs/language/json/json.worker',
          import.meta.url,
        ),
      );
    }
    return new Worker(
      new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url),
    );
  },
};

const modelUri = monaco.Uri.parse('file://ruleContent.json');

interface IRuleEditorProps {}

export const RuleEditor: React.FC<IRuleEditorProps> = (_props) => {
  const { selectedRule } = useSelectedRuleContext();
  const { data } = useGetRuleDetailQuery({ id: selectedRule?.id });

  const { data: schemaData, isFetching } = useRuleContextSchema();

  useEffect(() => {
    if (!schemaData) {
      return;
    }
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      schemaValidation: 'error',
      validate: true,
      schemas: [
        {
          fileMatch: [modelUri.toString()], // associate with our model
          schema: schemaData.data,
          uri: '/__self_service_path__/rule/context/schema',
        },
      ],
    });
  }, [schemaData]);

  const { mutateAsync: updateRule } = useUpdateRule();

  const divEl = useRef<HTMLDivElement>(null);
  const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (!data) {
      return;
    }
    if (editor.current) {
      editor.current.setValue(
        JSON.stringify(data?.data?.content ?? {}, null, 2),
      );
    }
  }, [data]);

  useEffect(() => {
    if (divEl.current) {
      console.log('init');
      const model = monaco.editor.createModel('', 'json', modelUri);
      editor.current = monaco.editor.create(divEl.current, {
        model,
        language: 'json',
        automaticLayout: true,
      });
    }

    return () => {
      editor.current?.getModel()?.dispose();
      editor.current?.dispose();
      editor.current = null;
    };
  }, []);

  return (
    <div className="h-full">
      <div
        className="flex justify-center items-center"
        onClick={async () => {
          const errorMarkers = monaco.editor
            .getModelMarkers({ resource: modelUri })
            .filter((marker) => {
              return marker.severity === monaco.MarkerSeverity.Error;
            });
          if (errorMarkers.length > 0) {
            message.error('Please fix the json error in the editor');
            return;
          }
          const currentValue = editor.current?.getModel()?.getValue();

          if (!currentValue) {
            message.error('Please input the json content');
            return;
          }
          try {
            const matchRule = JSON.parse(currentValue);
            await updateRule({
              id: selectedRule!.id,
              content: matchRule ?? {},
            });
          } catch (e) {
            console.error(e);
            message.error('The json content is invalid');
            return;
          }
        }}
      >
        <Button
          loading={isFetching}
          type="text"
          icon={<RiSaveLine size={14} />}
        >
          Save
        </Button>
      </div>
      {!selectedRule && (
        <div className="h-full flex justify-center items-center">
          <Empty description={false} />
        </div>
      )}
      <div
        className={`h-full ${!selectedRule ? 'hidden' : ''}`}
        ref={divEl}
      ></div>
    </div>
  );
};
