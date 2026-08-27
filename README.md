# next.js standalone + sharp libvips repro

Minimal reproduction: `output: 'standalone'`'s file tracer drops sharp's
libvips shared library, so a route that calls `sharp(...)` builds fine but
crashes at runtime with `ERR_DLOPEN_FAILED`.

**Must use pnpm.** With plain `npm install`, this appears to work — npm also
installs `@img/sharp-wasm32` (it declares no `os`/`cpu` restriction), and
sharp silently falls back to that WASM build when the native binary's
`dlopen` fails, masking the bug. pnpm does not install that fallback
package, so the crash is not masked. This matches production: our real
incident was on pnpm/Docker/Linux, where there's no WASM safety net either.

## Reproduce

```sh
pnpm install
pnpm exec next build
node .next/standalone/server.js &
curl http://localhost:3000/api/sharp-test
```

Expected: `sharp resize OK, 214 bytes`
Actual: `500`, with this in the server log:

```
⨯ Error: Failed to load external module sharp-...: Error: Could not load the "sharp" module using the <platform>-<arch> runtime
ERR_DLOPEN_FAILED: ... Library not loaded: @rpath/libvips-cpp.8.18.3.dylib (or .so on Linux)
  Reason: tried: '<...>/node_modules/.pnpm/@img+sharp-darwin-arm64@0.35.3/node_modules/@img/sharp-darwin-arm64/lib/../../sharp-libvips-darwin-arm64/lib/libvips-cpp.8.18.3.dylib' (no such file), ...
```

To confirm the file really is missing from the traced output:

```sh
find .next/standalone/node_modules/.pnpm -path '*sharp-libvips-*/lib' -exec ls -la {} \;
```

`index.js` and `package.json` are there (traced fine, they're referenced via
normal `require`/exports); the actual `.dylib`/`.so` binary — the thing
sharp's native addon `dlopen`s at runtime rather than `require`s — is not.

## Environment tested

- Next.js 16.2.11, `output: 'standalone'`
- sharp 0.35.3
- pnpm 11.x
- Reproduces on macOS (darwin-arm64, `.dylib`) and Linux (musl-arm64 via
  Docker, `.so`) — same root cause, same missing-file pattern, different
  platform-specific binary name.

## Workaround

```js
// next.config.js
outputFileTracingIncludes: {
  '/**': ['./node_modules/.pnpm/@img+sharp-libvips-*/node_modules/@img/**/*.dylib', './node_modules/.pnpm/@img+sharp-libvips-*/node_modules/@img/**/*.so*'],
},
```
