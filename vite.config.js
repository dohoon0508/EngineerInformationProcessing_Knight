import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const raw =
    env.VITE_DEV_API_PROXY ||
    env.VITE_STATS_API_BASE ||
    "https://engineerinformationprocessingknight.vercel.app";
  const apiProxyTarget = String(raw).replace(/\/$/, "");
  // `vercel dev` 는 자식 프로세스에 PORT 를 넣고, 그 포트로 띄운 서버에 프록시한다.
  // 포트를 안 맞추면 CLI 는 떠 있는데 브라우저는 붙지 않는 것처럼 보일 수 있음.
  const vercelPort = process.env.PORT ? Number(process.env.PORT) : undefined;

  return {
    plugins: [react()],
    server: {
      ...(vercelPort != null && !Number.isNaN(vercelPort)
        ? { port: vercelPort, strictPort: true }
        : {}),
      // 로컬 npm run dev 에는 /api 가 없음 → Vercel 서버리스로 넘김 (kakao-token, stats 등)
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
