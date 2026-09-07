import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

// 后端 dev 地址（与 frontend/ 桌面端 vite.config.ts 保持一致）。
// 生产部署：H5 产物与后端同源部署即可，无需代理。
const BACKEND = "http://127.0.0.1:8899";

const proxyTargets = ["/api", "/auth", "/sessions", "/runs"];

export default defineConfig({
  plugins: [uni()],
  server: {
    port: 5898,
    host:'0.0.0.0', // 关键:允许外部访问
    proxy: Object.fromEntries(
      proxyTargets.map((prefix) => [prefix, { target: BACKEND, changeOrigin: true }]),
    ),
  },
});
