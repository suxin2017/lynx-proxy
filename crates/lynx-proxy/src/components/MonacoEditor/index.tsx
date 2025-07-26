import React, { useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Button, Space, message, Tooltip, Spin, theme } from 'antd';
import {
  FormatPainterOutlined,
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ClearOutlined,
  CompressOutlined,
  ExpandOutlined,
} from '@ant-design/icons';
import type { editor } from 'monaco-editor';
import * as monaco from 'monaco-editor';

export type Language =
  | 'json'
  | 'javascript'
  | 'typescript'
  | 'html'
  | 'css'
  | 'xml'
  | 'yaml'
  | 'text'
  | 'plaintext';

export interface MonacoEditorProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  language?: Language;
  height?: number | string;
  placeholder?: string;
  readOnly?: boolean;
  showMinimap?: boolean;
  showLineNumbers?: boolean;
  theme?: 'vs-dark' | 'light' | 'vs';
  className?: string;
  showToolbar?: boolean;
  showToolbarActions?: boolean;
  wordWrap?: boolean;
  fontSize?: number;
  showFormatButton?: boolean;
  showCopyButton?: boolean;
  showClearButton?: boolean;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value = '',
  onChange,
  language = 'json',
  height = 300,
  placeholder = 'Enter your code here...',
  readOnly = false,
  showMinimap = false,
  showLineNumbers = true,
  theme: themeOverride,
  className = '',
  showToolbar = true,
  showToolbarActions = true,
  wordWrap = true,
  fontSize = 14,
  showFormatButton = true,
  showCopyButton = true,
  showClearButton = true,
}) => {
  // Ensure value is always a string to prevent type errors
  const safeValue = value && typeof value === 'string' ? value : '';

  const { token } = theme.useToken();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [isMinimapVisible, setIsMinimapVisible] = React.useState(showMinimap);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isEditorLoading, setIsEditorLoading] = React.useState(true);

  // 当编辑器属性发生变化时重置加载状态
  React.useEffect(() => {
    setIsEditorLoading(true);
  }, [language]);

  // 检测系统主题
  const [isDark, setIsDark] = React.useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  React.useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class'
        ) {
          setIsDark(document.documentElement.classList.contains('dark'));
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // 自动主题或使用指定主题
  const editorTheme = themeOverride || (isDark ? 'vs-dark' : 'light');

  const formatCode = useCallback(() => {
    if (!editorRef.current) return;

    try {
      if (language === 'json') {
        const currentValue = editorRef.current.getValue();
        if (currentValue.trim()) {
          const formatted = JSON.stringify(JSON.parse(currentValue), null, 2);
          editorRef.current.setValue(formatted);
          onChange?.(formatted);
          message.success('JSON formatted successfully');
        }
      } else {
        // 使用 Monaco 内置的格式化功能
        editorRef.current.getAction('editor.action.formatDocument')?.run();
        message.success('Code formatted successfully');
      }
    } catch (_error) {
      if (language === 'json') {
        message.error('Invalid JSON format');
      } else {
        message.error('Failed to format code');
      }
    }
  }, [language, onChange]);

  // 阻止浏览器默认的 Ctrl+S 保存行为
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        formatCode();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [formatCode]);

  const handleEditorDidMount = useCallback(
    (editor: editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
      setIsEditorLoading(false);

      // 设置更好的占位符效果
      if (placeholder && !safeValue) {
        editor.setPosition({ lineNumber: 1, column: 1 });

        // 添加占位符装饰
        const placeholderDecoration = editor.createDecorationsCollection([
          {
            range: new monaco.Range(1, 1, 1, 1),
            options: {
              after: {
                content: placeholder,
                inlineClassName: 'monaco-placeholder',
              },
            },
          },
        ]);

        // 监听内容变化来控制占位符显示
        editor.onDidChangeModelContent(() => {
          const currentValue = editor.getValue();
          if (currentValue) {
            placeholderDecoration.clear();
          } else if (!currentValue && placeholder) {
            placeholderDecoration.set([
              {
                range: new monaco.Range(1, 1, 1, 1),
                options: {
                  after: {
                    content: placeholder,
                    inlineClassName: 'monaco-placeholder',
                  },
                },
              },
            ]);
          }
        });
      }

      // 注意：样式更新逻辑移到了独立的 useEffect 中，确保主题切换时能响应更新

      // 添加 Ctrl+S 快捷键绑定
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        formatCode();
      });

      // 自动格式化 JSON（如果是 JSON 且有内容）
      if (language === 'json' && safeValue && safeValue.trim()) {
        try {
          const formatted = JSON.stringify(JSON.parse(safeValue), null, 2);
          if (formatted !== safeValue) {
            editor.setValue(formatted);
            onChange?.(formatted);
          }
        } catch {
          // 忽略 JSON 解析错误，保持原内容
        }
      }
    },
    [placeholder, safeValue, formatCode, language, onChange],
  );

  // 独立的样式更新逻辑，响应主题切换
  React.useEffect(() => {
    // 生成动态样式内容的函数
    const generateStyleContent = () => `
      /* ==================== 占位符样式 ==================== */
      /* 为空编辑器显示的占位符文本样式，使用 antd 的占位符颜色 token */
      .monaco-placeholder {
        color: ${token.colorTextPlaceholder} !important;
        font-style: italic;
        opacity: 0.7;
      }
      
      /* ==================== Monaco 编辑器弹窗组件样式 ==================== */
      /* 代码自动补全建议弹窗样式，使用 antd 的高级容器背景和阴影 */
      .monaco-editor .suggest-widget {
        border-radius: ${token.borderRadius}px !important;
        box-shadow: ${token.boxShadowSecondary} !important;
        backdrop-filter: blur(12px) !important;
        border: 1px solid ${token.colorBorder} !important;
        background: ${token.colorBgElevated} !important;
        animation: slideInDown 0.2s ease-out !important;
      }
      
      /* 函数参数提示弹窗样式，较小的圆角和阴影 */
      .monaco-editor .parameter-hints-widget {
        border-radius: ${token.borderRadiusSM}px !important;
        box-shadow: ${token.boxShadow} !important;
        backdrop-filter: blur(8px) !important;
        background: ${token.colorBgElevated} !important;
        animation: fadeInUp 0.15s ease-out !important;
      }
      
      /* 鼠标悬停代码时的提示弹窗样式 */
      .monaco-editor .monaco-hover {
        border-radius: ${token.borderRadiusSM}px !important;
        box-shadow: ${token.boxShadow} !important;
        backdrop-filter: blur(8px) !important;
        background: ${token.colorBgElevated} !important;
        animation: fadeIn 0.15s ease-out !important;
      }
      
      /* 查找和替换弹窗样式 */
      .monaco-editor .find-widget {
        border-radius: ${token.borderRadius}px !important;
        box-shadow: ${token.boxShadowTertiary} !important;
        backdrop-filter: blur(12px) !important;
        background: ${token.colorBgElevated} !important;
      }
      
      /* ==================== 滚动条美化样式 ==================== */
      /* 滚动条轨道基础样式，默认半透明显示 */
      .monaco-editor .monaco-scrollable-element > .scrollbar {
        border-radius: ${token.borderRadiusXS}px !important;
        opacity: 0.2 !important;
        transition: opacity 0.3s ease-in-out !important;
        background: ${token.colorFillQuaternary} !important;
      }
      
      /* 滚动条在容器悬停或自身悬停时的样式 */
      .monaco-editor .monaco-scrollable-element:hover > .scrollbar,
      .monaco-editor .monaco-scrollable-element > .scrollbar:hover {
        opacity: 0.6 !important;
        transition: opacity 0.2s ease-in-out !important;
      }
      
      /* 滚动条在拖拽激活状态时的样式 */
      .monaco-editor .monaco-scrollable-element > .scrollbar.active {
        opacity: 0.8 !important;
      }
      
      /* 滚动条内部滑块的基础样式 */
      .monaco-editor .monaco-scrollable-element > .scrollbar > .slider {
        border-radius: ${token.borderRadiusXS}px !important;
        background: ${token.colorFillSecondary} !important;
        transition: all 0.2s ease-in-out !important;
      }
      
      /* 滚动条悬停时滑块颜色变化 */
      .monaco-editor .monaco-scrollable-element > .scrollbar:hover > .slider {
        background: ${token.colorFill} !important;
      }
      
      /* 滚动条激活时滑块使用主题色 */
      .monaco-editor .monaco-scrollable-element > .scrollbar.active > .slider {
        background: ${token.colorPrimary} !important;
      }
      
      /* ==================== 滚动条性能和动画优化 ==================== */
      /* 使用 CSS containment 防止滚动条区域重绘时的闪烁 */
      .monaco-editor .monaco-scrollable-element {
        contain: layout style paint !important;
      }
      
      /* 滚动条淡出时的延迟动画，避免快速移动时频繁闪烁 */
      .monaco-editor .monaco-scrollable-element > .scrollbar.fade {
        transition: opacity 0.4s ease-in-out 0.1s !important;
      }
      
      /* 完全隐藏的滚动条状态，移除交互能力 */
      .monaco-editor .monaco-scrollable-element > .scrollbar.invisible {
        opacity: 0 !important;
        pointer-events: none !important;
      }
      
      /* ==================== 弹窗动画关键帧定义 ==================== */
      /* 建议弹窗的向下滑入动画 */
      @keyframes slideInDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* 参数提示的向上淡入动画 */
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* 悬停提示的简单淡入动画 */
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;

    // 查找或创建样式元素
    let styleElement = document.querySelector(
      '[data-monaco-custom-styles]',
    ) as HTMLStyleElement;

    if (!styleElement) {
      // 如果样式元素不存在，创建新的
      styleElement = document.createElement('style');
      styleElement.setAttribute('data-monaco-custom-styles', 'true');
      document.head.appendChild(styleElement);
    }

    // 更新样式内容，确保主题切换时样式也会更新
    styleElement.textContent = generateStyleContent();

    // 清理函数：组件卸载时移除样式
    return () => {
      const existingStyle = document.querySelector(
        '[data-monaco-custom-styles]',
      );
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [token]); // 依赖 token，确保主题切换时重新生成样式

  const copyToClipboard = useCallback(async () => {
    if (!editorRef.current) return;

    try {
      const content = editorRef.current.getValue();
      await navigator.clipboard.writeText(content);
      message.success('Copied to clipboard');
    } catch (_error) {
      message.error('Failed to copy to clipboard');
    }
  }, []);

  const clearContent = useCallback(() => {
    if (!editorRef.current) return;

    editorRef.current.setValue('');
    onChange?.('');
    message.success('Content cleared');
  }, [onChange]);

  const toggleMinimap = useCallback(() => {
    if (!editorRef.current) return;

    const newValue = !isMinimapVisible;
    setIsMinimapVisible(newValue);
    editorRef.current.updateOptions({ minimap: { enabled: newValue } });
  }, [isMinimapVisible]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const editorOptions: editor.IStandaloneEditorConstructionOptions = {
    readOnly,
    minimap: {
      enabled: isMinimapVisible,
      side: 'right',
      size: 'proportional',
      showSlider: 'mouseover',
      renderCharacters: true,
      maxColumn: 120,
    },
    lineNumbers: showLineNumbers ? 'on' : 'off',
    wordWrap: wordWrap ? 'on' : 'off',
    fontSize,
    fontFamily:
      "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', 'Roboto Mono', Monaco, Consolas, 'Courier New', monospace",
    fontLigatures: true,
    fontWeight: '400',
    automaticLayout: true,

    // 编辑器行为优化
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    smoothScrolling: true,
    mouseWheelZoom: true,
    multiCursorModifier: 'ctrlCmd',

    // 缩进和对齐
    tabSize: 2,
    insertSpaces: true,
    detectIndentation: true,
    trimAutoWhitespace: true,

    // 代码折叠
    folding: true,
    foldingStrategy: 'auto',
    foldingImportsByDefault: false,
    unfoldOnClickAfterEndOfLine: false,

    // 括号匹配
    matchBrackets: 'always',
    bracketPairColorization: {
      enabled: true,
      independentColorPoolPerBracketType: true,
    },

    // 滚动条美化
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto',
      useShadows: false,
      verticalHasArrows: false,
      horizontalHasArrows: false,
      verticalScrollbarSize: 12,
      horizontalScrollbarSize: 12,
      arrowSize: 0,
      alwaysConsumeMouseWheel: false,
      handleMouseWheel: true,
    },

    // 代码提示和建议
    suggest: {
      showIcons: true,
      showStatusBar: true,
      preview: true,
      previewMode: 'subwordSmart',
    },

    // 快速建议
    quickSuggestions: {
      other: true,
      comments: false,
      strings: false,
    },

    // 参数提示
    parameterHints: {
      enabled: true,
      cycle: true,
    },

    // 悬停提示
    hover: {
      enabled: true,
      delay: 300,
      sticky: true,
    },

    // 渲染优化
    renderLineHighlight: 'line',
    renderWhitespace: 'selection',
    renderControlCharacters: false,
    guides: {
      indentation: true,
      highlightActiveIndentation: true,
    },

    // 选择和查找
    selectionHighlight: true,
    occurrencesHighlight: 'singleFile',
    codeLens: false,

    // 编辑器外观
    roundedSelection: true,
    selectionClipboard: false,
    contextmenu: true,

    // 性能优化
    disableLayerHinting: false,
    disableMonospaceOptimizations: false,
    hideCursorInOverviewRuler: false,

    // 行高和间距
    lineHeight: 1.6,
    letterSpacing: 0.5,

    // 粘贴行为
    formatOnPaste: true,
    formatOnType: true,

    // 拖拽
    dragAndDrop: !readOnly,

    // 滚动行为
    scrollBeyondLastLine: false,
    scrollBeyondLastColumn: 5,

    // 光标样式
    cursorStyle: 'line',
    cursorWidth: 2,

    // 高级编辑器选项
    accessibilitySupport: 'auto',
    autoClosingBrackets: 'always',
    autoClosingQuotes: 'always',
    autoIndent: 'full',
    autoSurround: 'languageDefined',

    // 代码补全增强
    acceptSuggestionOnCommitCharacter: true,
    acceptSuggestionOnEnter: 'on',
    suggestOnTriggerCharacters: true,

    // 查找和替换
    find: {
      seedSearchStringFromSelection: 'always',
      autoFindInSelection: 'multiline',
    },

    // 更好的视觉效果
    overviewRulerBorder: false,

    // 智能选择
    smartSelect: {
      selectLeadingAndTrailingWhitespace: false,
    },
  };

  // 自定义主题配置
  const customThemes = React.useMemo(
    () => ({
      'github-light': {
        base: 'vs' as const,
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'd73a49', fontStyle: 'bold' },
          { token: 'string', foreground: '032f62' },
          { token: 'number', foreground: '005cc5' },
        ],
        colors: {
          'editor.background': token.colorBgContainer,
          'editor.foreground': token.colorText,
          'editor.lineHighlightBackground': token.colorFillQuaternary,
          'editor.selectionBackground': token.colorPrimaryBg,
          'editorLineNumber.foreground': token.colorTextTertiary,
          'editorLineNumber.activeForeground': token.colorText,
        },
      },
      'github-dark': {
        base: 'vs-dark' as const,
        inherit: true,
        rules: [
          { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'ff7b72', fontStyle: 'bold' },
          { token: 'string', foreground: 'a5d6ff' },
          { token: 'number', foreground: '79c0ff' },
        ],
        colors: {
          'editor.background': token.colorBgContainer,
          'editor.foreground': token.colorText,
          'editor.lineHighlightBackground': token.colorFillQuaternary,
          'editor.selectionBackground': token.colorPrimaryBg,
          'editorLineNumber.foreground': token.colorTextTertiary,
          'editorLineNumber.activeForeground': token.colorText,
        },
      },
    }),
    [token],
  );

  // 注册自定义主题
  React.useEffect(() => {
    Object.entries(customThemes).forEach(([name, theme]) => {
      monaco.editor.defineTheme(name, theme);
    });
  }, [customThemes]);

  const containerClass = `
    ${className} 
    ${isFullscreen ? 'fixed inset-0 z-50' : 'relative'}
    transition-all duration-300 ease-in-out
    overflow-hidden
  `.trim();

  const containerStyle = {
    color: token.colorText,
    backgroundColor: token.colorBgContainer,
    border: `1px solid ${token.colorBorder}`,
    borderRadius: token.borderRadius,
  };

  const toolbarStyle = {
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgElevated,
    backdropFilter: 'blur(8px)',
    color: token.colorText,
    borderRadius: `${token.borderRadius}px ${token.borderRadius}px 0 0`,
  };

  return (
    <div className={containerClass} style={containerStyle}>
      {showToolbar && (
        <div
          className="flex items-center justify-between px-4 py-2"
          style={toolbarStyle}
        >
          <Space size="small">
            {showToolbarActions && (
              <>
                {showFormatButton && (
                  <Tooltip title="Format Code (Ctrl+S)" placement="bottom">
                    <Button
                      type="text"
                      size="small"
                      icon={<FormatPainterOutlined />}
                      onClick={formatCode}
                      disabled={readOnly || !safeValue}
                      style={{
                        color: token.colorText,
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          token.colorPrimaryBg;
                        e.currentTarget.style.color = token.colorPrimary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = token.colorText;
                      }}
                    >
                    </Button>
                  </Tooltip>
                )}

                {showCopyButton && (
                  <Tooltip title="Copy to Clipboard" placement="bottom">
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={copyToClipboard}
                      disabled={!safeValue}
                      style={{
                        color: token.colorText,
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          token.colorSuccessBg;
                        e.currentTarget.style.color = token.colorSuccess;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = token.colorText;
                      }}
                    >
                    </Button>
                  </Tooltip>
                )}

                {showClearButton && (
                  <Tooltip title="Clear Content" placement="bottom">
                    <Button
                      type="text"
                      size="small"
                      icon={<ClearOutlined />}
                      onClick={clearContent}
                      disabled={readOnly || !safeValue}
                      danger
                      style={{
                        color: token.colorText,
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          token.colorErrorBg;
                        e.currentTarget.style.color = token.colorError;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = token.colorText;
                      }}
                    >
                    </Button>
                  </Tooltip>
                )}
              </>
            )}
          </Space>

          <Space size="small">
            <Tooltip
              title={`${isMinimapVisible ? 'Hide' : 'Show'} Minimap`}
              placement="bottom"
            >
              <Button
                type="text"
                size="small"
                icon={
                  isMinimapVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />
                }
                onClick={toggleMinimap}
                style={{
                  color: isMinimapVisible
                    ? token.colorPrimary
                    : token.colorText,
                  backgroundColor: isMinimapVisible
                    ? token.colorPrimaryBg
                    : 'transparent',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isMinimapVisible) {
                    e.currentTarget.style.backgroundColor =
                      token.colorFillSecondary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMinimapVisible) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              />
            </Tooltip>

            <Tooltip
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              placement="bottom"
            >
              <Button
                type="text"
                size="small"
                icon={isFullscreen ? <CompressOutlined /> : <ExpandOutlined />}
                onClick={toggleFullscreen}
                style={{
                  color: isFullscreen ? token.colorPrimary : token.colorText,
                  backgroundColor: isFullscreen
                    ? token.colorPrimaryBg
                    : 'transparent',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isFullscreen) {
                    e.currentTarget.style.backgroundColor =
                      token.colorFillSecondary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isFullscreen) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              />
            </Tooltip>

            {/* 状态指示器 */}
            <div
              className="ml-2 flex items-center gap-2 text-xs"
              style={{ color: token.colorTextSecondary }}
            >
              <span style={{ color: token.colorPrimary, fontWeight: 500 }}>
                {language.toUpperCase()}
              </span>
              {safeValue && (
                <>
                  <span>•</span>
                  <span>{safeValue.split('\n').length} lines</span>
                </>
              )}
            </div>

            {/* 快捷键提示 */}
            {!readOnly && (
              <div
                className="ml-2 hidden items-center gap-2 text-xs md:flex"
                style={{ color: token.colorTextTertiary }}
              >
                <kbd
                  className="rounded px-1.5 py-0.5 text-xs"
                  style={{
                    backgroundColor: token.colorFillQuaternary,
                    color: token.colorTextSecondary,
                    border: `1px solid ${token.colorBorder}`,
                  }}
                >
                  Ctrl+S
                </kbd>
                <span>Format</span>
              </div>
            )}
          </Space>
        </div>
      )}

      <div
        className="relative overflow-hidden"
        style={{
          height: isFullscreen ? 'calc(100vh - 57px)' : height,
          background: token.colorBgContainer,
        }}
      >
        <Editor
          value={safeValue}
          language={language}
          theme={editorTheme}
          onChange={onChange}
          onMount={handleEditorDidMount}
          options={editorOptions}
          loading={
            isEditorLoading ? (
              <div
                className="flex  items-center justify-center"
                style={{ backgroundColor: token.colorBgContainer }}
              >
                <Spin
                  style={{
                    color: token.colorPrimary,
                  }}
                />
                <div
                  className="ml-3 text-sm font-medium"
                  style={{
                    color: token.colorTextSecondary,
                  }}
                >
                  Loading Editor...
                </div>
              </div>
            ) : undefined
          }
        />
      </div>
    </div>
  );
};

export default MonacoEditor;
