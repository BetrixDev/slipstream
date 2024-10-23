// vite.config.ts
import { vitePlugin as remix } from "file:///D:/Development/flowble/node_modules/.pnpm/@remix-run+dev@2.12.1_@remix-run+react@2.12.1_react-dom@18.3.1_react@18.3.1__react@18.3.1_typ_ucwj6zfxoazq6ctfrl3vpxjvgu/node_modules/@remix-run/dev/dist/index.js";
import { defineConfig } from "file:///D:/Development/flowble/node_modules/.pnpm/vite@5.4.7_@types+node@22.6.2_lightningcss@1.27.0_terser@5.34.1/node_modules/vite/dist/node/index.js";
import tsconfigPaths from "file:///D:/Development/flowble/node_modules/.pnpm/vite-tsconfig-paths@4.3.2_typescript@5.4.5_vite@5.4.7_@types+node@22.6.2_lightningcss@1.27.0_terser@5.34.1_/node_modules/vite-tsconfig-paths/dist/index.mjs";
import { vercelPreset } from "file:///D:/Development/flowble/node_modules/.pnpm/@vercel+remix@2.12.0_@remix-run+dev@2.12.1_@remix-run+react@2.12.1_react-dom@18.3.1_react@18._3mbsh6bzshduzselatcgrylm6q/node_modules/@vercel/remix/vite.js";
var vite_config_default = defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true
      },
      presets: [vercelPreset()]
    }),
    tsconfigPaths()
  ],
  publicDir: "assets",
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxEZXZlbG9wbWVudFxcXFxmbG93YmxlXFxcXGFwcHNcXFxcd2ViXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxEZXZlbG9wbWVudFxcXFxmbG93YmxlXFxcXGFwcHNcXFxcd2ViXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9EZXZlbG9wbWVudC9mbG93YmxlL2FwcHMvd2ViL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgdml0ZVBsdWdpbiBhcyByZW1peCB9IGZyb20gXCJAcmVtaXgtcnVuL2RldlwiO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCB0c2NvbmZpZ1BhdGhzIGZyb20gXCJ2aXRlLXRzY29uZmlnLXBhdGhzXCI7XG5pbXBvcnQgeyB2ZXJjZWxQcmVzZXQgfSBmcm9tIFwiQHZlcmNlbC9yZW1peC92aXRlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZW1peCh7XG4gICAgICBmdXR1cmU6IHtcbiAgICAgICAgdjNfZmV0Y2hlclBlcnNpc3Q6IHRydWUsXG4gICAgICAgIHYzX3JlbGF0aXZlU3BsYXRQYXRoOiB0cnVlLFxuICAgICAgICB2M190aHJvd0Fib3J0UmVhc29uOiB0cnVlLFxuICAgICAgfSxcbiAgICAgIHByZXNldHM6IFt2ZXJjZWxQcmVzZXQoKV0sXG4gICAgfSksXG4gICAgdHNjb25maWdQYXRocygpLFxuICBdLFxuICBwdWJsaWNEaXI6IFwiYXNzZXRzXCIsXG4gIG9wdGltaXplRGVwczoge1xuICAgIGV4Y2x1ZGU6IFtcIkBmZm1wZWcvZmZtcGVnXCIsIFwiQGZmbXBlZy91dGlsXCJdLFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlSLFNBQVMsY0FBYyxhQUFhO0FBQzdULFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sbUJBQW1CO0FBQzFCLFNBQVMsb0JBQW9CO0FBRTdCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxNQUNKLFFBQVE7QUFBQSxRQUNOLG1CQUFtQjtBQUFBLFFBQ25CLHNCQUFzQjtBQUFBLFFBQ3RCLHFCQUFxQjtBQUFBLE1BQ3ZCO0FBQUEsTUFDQSxTQUFTLENBQUMsYUFBYSxDQUFDO0FBQUEsSUFDMUIsQ0FBQztBQUFBLElBQ0QsY0FBYztBQUFBLEVBQ2hCO0FBQUEsRUFDQSxXQUFXO0FBQUEsRUFDWCxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsa0JBQWtCLGNBQWM7QUFBQSxFQUM1QztBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
