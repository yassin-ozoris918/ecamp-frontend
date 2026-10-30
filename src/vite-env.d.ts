/// <reference types="vite/client" />

declare module 'warning' {
  function warning(condition: any, format: string, ...args: any[]): void;
  export default warning;
}
