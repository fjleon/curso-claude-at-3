import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'

// Raíz del monorepo: los scripts dev:api y dev:clientes se lanzan desde allí.
const rootDir = path.resolve(__dirname, '../..')

const viewport = { width: 1280, height: 800 }

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4202',
    viewport,
    video: { mode: 'on', size: viewport },
    launchOptions: {
      // Ralentiza las acciones para que el vídeo se pueda seguir a simple vista.
      slowMo: 400
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport }
    }
  ],
  webServer: [
    {
      command: 'npm run dev:api',
      cwd: rootDir,
      url: 'http://localhost:3000/health',
      reuseExistingServer: true,
      timeout: 60_000
    },
    {
      command: 'npm run dev:clientes',
      cwd: rootDir,
      url: 'http://localhost:4202',
      reuseExistingServer: true,
      timeout: 180_000
    }
  ]
})
