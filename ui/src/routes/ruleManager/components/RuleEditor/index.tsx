import React, { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { useGetRuleDetailQuery } from '@/api/rule';
import { useSelectedRuleContext } from '../store';
import { Empty } from 'antd';

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

monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
  schemaValidation: 'error',
  validate: true,
  schemas: [
    {
      uri: 'https://json-schema.org/draft/2020-12/schema',
      fileMatch: [modelUri.toString()], // associate with our model
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          match: {
            type: 'object',
            additionalProperties: false,
            properties: {
              uri: {
                title: 'URI',
                markdownDescription: `
Match the corresponding request link with the uri

Supports the following

- Exact match: https://example.com
- Wildcard match: https://example.com/*
- Domain match: example.com`,
                examples: [
                  'https://example.com',
                  'https://example.com/*',
                  'example.com',
                ],
                type: 'string',
              },
            },
            required: ['uri'],
          },
          target: {
            type: 'object',
            additionalProperties: false,
            properties: {
              uri: {
                markdownDescription: `
Forward to the specified uri

For example
- https://example.com`,
                type: 'string',
              },
            },
            required: ['uri'],
          },
        },
        required: ['match', 'target'],
      },
    },
  ],
});

interface IRuleEditorProps {}

export const RuleEditor: React.FC<IRuleEditorProps> = (_props) => {
  const { selectedRule } = useSelectedRuleContext();
  const { data } = useGetRuleDetailQuery({ id: selectedRule?.id });

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
  }, [selectedRule]);

  if (!selectedRule) {
    return (
      <div className="h-full flex justify-center items-center">
        <Empty description={false} />
      </div>
    );
  }

  return <div className="h-full" ref={divEl}></div>;
};
