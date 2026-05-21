/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CREATIONFLOW_API_URL: string;
  readonly VITE_EDITOR_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
