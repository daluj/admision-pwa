/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Persistence adapter: `dexie` (default) or `memory`. */
  readonly VITE_DATA_BACKEND?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
