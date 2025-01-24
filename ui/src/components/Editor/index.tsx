import React, { useEffect } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { json } from '@codemirror/lang-json';
import { ayuLight } from 'thememirror';

interface IEditorProps {}

export const Editor: React.FC<IEditorProps> = (props) => {
  const editorRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    const view = new EditorView({
      parent: editorRef.current,
      extensions: [basicSetup, json(), ayuLight],
    });
    return () => {
      view.destroy();
    };
  }, []);
  return <div ref={editorRef} />;
};
