import { defineConfig } from 'vite';

// 개발/프리뷰 서버에서 /ws를 Rust 게임 서버(기본 8080)로 프록시
const proxy = {
  '/ws': { target: `ws://localhost:${process.env.GAME_SERVER_PORT ?? 8080}`, ws: true },
};

export default defineConfig({
  server: { proxy },
  preview: { proxy },
});
