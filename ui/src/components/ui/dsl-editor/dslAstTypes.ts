export interface DslSpan {
  start: number
  end: number
}

export interface DslSpanned<T> {
  value: T
  span: DslSpan
}

export interface DslProgram {
  expr: DslExpr | null
}

export interface DslParseErrorInfo {
  message: string
  start: number
  end: number
}

export interface DslParseProgramOutcome {
  program: DslProgram
  error: DslParseErrorInfo | null
}

export interface DslExpr {
  or: DslOrExpr
  span: DslSpan
}

export interface DslOrExpr {
  branches: DslAndExpr[]
  span: DslSpan
}

export interface DslAndExpr {
  terms: DslNotExpr[]
  span: DslSpan
}

export type DslNotExpr =
  | { Not: { inner: DslNotExpr, span: DslSpan } }
  | { Primary: DslPrimary }

export type DslPrimary =
  | { CliOnly: DslCliArgs }
  | { Url: { url: DslUrl, cli: DslCliArgs | null } }
  | { Grouped: DslExpr }

export interface DslUrl {
  scheme: DslSpanned<string> | null
  host: DslSpanned<string> | null
  port: DslSpanned<string> | null
  path: DslSpanned<string> | null
  span: DslSpan
}

export interface DslCliArgs {
  args: DslCliArg[]
  span: DslSpan
}

export interface DslCliArg {
  flag: DslSpanned<string>
  value: DslCliArgValue | null
  span: DslSpan
}

export type DslCliArgValue =
  | { Eq: DslSpanned<string> }
  | { Bare: DslSpanned<string> }
