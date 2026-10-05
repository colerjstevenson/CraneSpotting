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
      NEXT_PUBLIC_SUPABASE_URL: bindings.secret(),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: bindings.secret(),
      APP_URL: bindings.text("https://cranespotting.colerjstevenson.workers.dev/"),
      SUPABASE_SERVICE_ROLE_KEY: bindings.secret(),
    },
  }),
});
