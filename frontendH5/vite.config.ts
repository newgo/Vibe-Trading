import type { ClientRequest } from "node:http";
import { defineConfig, loadEnv } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

// 后端地址覆盖机制与桌面端 frontend/vite.config.ts 一致：
// docker-compose 里设 VITE_API_URL=http://vibe-trading:8899（容器网络），
// 本地开发默认 127.0.0.1:8899。loadEnv 会合并 process.env 且进程环境优先。
const proxyTargets = ["/api", "/auth", "/sessions", "/runs"];

function backendProxy(target: string): {
  target: string;
  changeOrigin: boolean;
  configure: (proxy: { on: (event: string, cb: (proxyReq: ClientRequest) => void) => void }) => void;
} {
  return {
    target,
    changeOrigin: true,
    // 后端对非 GET/HEAD/OPTIONS 请求做 CSRF 校验（agent/src/api/security.py 的
    // _reject_cross_site_browser_request）：Origin 必须是回环，或与 Host 一致。
    // 经花生壳等外网隧道或容器化 dev server 访问时，浏览器 Origin 是外网域名，
    // 而 changeOrigin 已把 Host 改写为后端地址 —— 两者必然不一致，
    // 触发 403 "Cross-site request denied"。
    // 删除 Origin 头后，后端将其视为普通 API 调用（回环信任放行，无需 API Key）。
    configure: (proxy) => {
      proxy.on("proxyReq", (proxyReq) => {
        proxyReq.removeHeader("origin");
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backend = env.VITE_API_URL || "http://127.0.0.1:8899";

  return {
    plugins: [uni()],
    server: {
      port: 5898,
      proxy: Object.fromEntries(
        proxyTargets.map((prefix) => [prefix, backendProxy(backend)]),
      ),
    },
  };
});
