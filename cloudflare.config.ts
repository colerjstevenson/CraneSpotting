import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "cranespotting",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-04",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    env: {
      ASSETS: bindings.assets(),
      AI: bindings.ai({ dev: { remote: true } }),
      NEXT_PUBLIC_SUPABASE_URL: bindings.text("https://msjnmxicavgvkjzfvucc.supabase.co"),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: bindings.text("sb_publishable_PbYvqJuQnglGlnTxvCrlKA_ugs3rHyD"),
      APP_URL: bindings.text("https://cranespotting.colerjstevenson.workers.dev/"),
      SUPABASE_SERVICE_ROLE_KEY: bindings.secret(),
    },
  }),
});
