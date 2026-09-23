const Module = await import("node:module");
const require =
  /* @__PURE__ */ (Module?.default?.createRequire ?? Module?.createRequire)(
    import.meta.url,
  );
const __filename = /* @__PURE__ */ (await import("node:url")).fileURLToPath(
  import.meta.url,
);
const __dirname = /* @__PURE__ */ (await import("node:path")).dirname(
  __filename,
);

console.log("Applying Deno shim...");

globalThis.__filename = __filename;
globalThis.__dirname = __dirname;
globalThis.require = require;
