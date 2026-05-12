interface RequireContext {
  keys: () => string[];
  (key: string): unknown;
}

interface NodeRequire {
  context: (directory: string, useSubdirectories?: boolean, regExp?: RegExp) => RequireContext;
}
