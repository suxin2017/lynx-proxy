import { MonacoEditor } from '../../../components/MonacoEditor';
import { HeaderItem } from './types';
import { useMemo } from 'react';

interface BodyEditorProps {
  body: string;
  onBodyChange: (body: string) => void;
  headers?: HeaderItem[];
}

export function BodyEditor({ body, onBodyChange, headers }: BodyEditorProps) {
  // Extract Content-Type from headers to determine editor language
  const contentType = useMemo(() => {
    if (!headers) return null;

    const contentTypeHeader = headers.find(
      (header) => header.enabled && header.key.toLowerCase() === 'content-type',
    );

    return contentTypeHeader?.value?.toLowerCase() || null;
  }, [headers]);

  // Determine Monaco editor language based on Content-Type
  const editorLanguage = useMemo(() => {
    if (!contentType) return 'json'; // Default to JSON

    if (contentType.includes('application/json')) return 'json';

    // For all other content types, use plaintext
    return 'plaintext';
  }, [contentType]);

  const getPlaceholder = () => {
    switch (editorLanguage) {
      case 'json':
        return '{\n  "key": "value",\n  "array": [1, 2, 3],\n  "nested": {\n    "property": "example"\n  }\n}';
      default:
        return 'Enter your request body here...';
    }
  };

  return (
    <div className="flex  flex-col py-4">
      <div className="flex-1 rounded">
        <MonacoEditor
          value={body}
          onChange={(value) => onBodyChange(value || '')}
          language={editorLanguage}
          height={400}
          placeholder={getPlaceholder()}
          showToolbar={true}
          showLineNumbers={false}
          wordWrap={true}
          fontSize={14}
          showMinimap={false}
        />
      </div>
    </div>
  );
}
