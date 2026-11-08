import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests',
  testMatch:'**/*.spec.mjs',
  fullyParallel:false,
  workers:1,
  use:{baseURL:'http://127.0.0.1:4173',browserName:'chromium',reducedMotion:'reduce'},
  webServer:{command:'npm run dev',url:'http://127.0.0.1:4173',reuseExistingServer:true},
});
