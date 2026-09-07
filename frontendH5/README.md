# Vibe Trading H5（移动端瘦版）

uni-app (Vue3 + TypeScript + Vite + Pinia) 的移动端 H5，独立于桌面端 `frontend/`，仅复用其后端契约（不 import 桌面端源码）。

## 功能范围（瘦版 v0.1）

| 模块 | 页面 | 后端接口 |
| --- | --- | --- |
| Agent 对话 | 会话列表 / 聊天（SSE 流式、tool 轨迹、取消） | `/sessions`、`/sessions/{id}/messages`、`/sessions/{id}/events`、`/sessions/{id}/cancel` |
| 持仓看板 | 账户 + 持仓只读快照 | `GET /api/portfolio` |
| 回测报告 | 运行列表 + 指标详情（无图表） | `GET /runs?limit=100`、`GET /runs/{id}?chart_payload=summary` |
| 设置 | API Key、主题 | （本地存储） |

## 运行

```bash
cd frontendH5
npm install
npm run dev:h5     # http://localhost:5898（端口与桌面端 5899 错开）
npm run build:h5   # 产物输出 dist/build/h5
```

## 后端与代理

- dev 模式下 `/api` `/auth` `/sessions` `/runs` 前缀由 vite 代理到 `http://127.0.0.1:8899`（见 `vite.config.ts`）。
- 鉴权与桌面端一致：可选 API Key，请求带 `Authorization: Bearer`；SSE 通过 `POST /auth/sse-ticket` 换一次性 ticket。回环开发模式（无 Key）直连。
- **真机调试**：后端默认绑定 `127.0.0.1`，手机无法访问，需要后端以 `--host 0.0.0.0` 启动并将 `vite.config.ts` 的 `BACKEND` 改为局域网 IP，或使用部署环境。

## SSE 说明

仅发布 H5，聊天流式直接使用浏览器原生 `EventSource`（`src/lib/sse.ts`），行为对齐桌面端 `frontend/src/hooks/useSSE.ts`：指数退避重连、`Last-Event-ID` 续传、LRU 去重、一次性 ticket 鉴权。瘦版只订阅 Agent 对话所需事件，未实现 goal/swarm/live 等桌面专属事件。

## 目录结构

```
src/
├─ api/        # 后端接口封装（agent / portfolio / runs）
├─ components/ # 消息气泡、工具轨迹、输入栏
├─ lib/        # http、auth、sse、markdown、format
├─ pages/      # chat / portfolio / reports / me
├─ stores/     # Pinia：settings / sessions / chat / portfolio
└─ types/      # 后端 DTO 精简版
```
