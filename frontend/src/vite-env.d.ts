/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** OpenPanel's public client id. Absent means no analytics at all. */
  readonly VITE_OPENPANEL_CLIENT_ID?: string;
  /** Where events go. Defaults to the same-origin path nginx forwards. */
  readonly VITE_OPENPANEL_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
