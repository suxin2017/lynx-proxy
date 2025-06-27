export type Language =
  | 'json'
  | 'javascript'
  | 'typescript'
  | 'html'
  | 'css'
  | 'xml'
  | 'yaml'
  | 'text'
  | 'plaintext'
  | 'markdown'
  | 'sql'
  | 'python'
  | 'java'
  | 'cpp'
  | 'csharp';

export interface EditorTheme {
  name: string;
  value: 'vs-dark' | 'light' | 'vs';
  isDark: boolean;
}

export const SUPPORTED_LANGUAGES: Array<{ label: string; value: Language }> = [
  { label: 'JSON', value: 'json' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'XML', value: 'xml' },
  { label: 'YAML', value: 'yaml' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'SQL', value: 'sql' },
  { label: 'Python', value: 'python' },
  { label: 'Plain Text', value: 'text' },
];

export const EDITOR_THEMES: EditorTheme[] = [
  { name: 'Dark', value: 'vs-dark', isDark: true },
  { name: 'Light', value: 'light', isDark: false },
  { name: 'Visual Studio', value: 'vs', isDark: false },
];
