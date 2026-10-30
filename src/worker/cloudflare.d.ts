// Keep runtime module declarations scoped so Cloudflare's DOM substitutes do not
// replace the browser DOM types used by the shared React application.
declare module 'cloudflare:node' {
  export function httpServerHandler(options: { port: number }): {
    fetch(request: Request): Promise<Response>;
  };
}

declare module 'cloudflare:workers' {
  export const env: unknown;
}

declare module '*.wasm' {
  const module: WebAssembly.Module;
  export default module;
}
