import { defineConfig } from 'vite';

export default defineConfig({
  // 設定部署在 GitHub Pages 時的基礎路徑
  // 如果您的 GitHub 儲存庫名稱不是 volunteer-checkin-web，請將下方修改為您自訂的儲存庫名稱
  base: './', // 使用相對路徑在 GitHub Pages 上最不容易因為路徑設定錯誤而掛掉
  server: {
    host: true,
    port: 5173
  }
});
