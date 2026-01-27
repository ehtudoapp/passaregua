declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
  // add other env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
