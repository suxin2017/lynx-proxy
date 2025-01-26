export function ifTrue<T>(condition: boolean, expr: T) {
  return condition ? expr : null;
}
