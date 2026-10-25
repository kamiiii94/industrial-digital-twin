import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import cesiumModule from 'vite-plugin-cesium'

// سازگار با هر دو حالت ESM/CJS
const cesiumPlugin =
  (
    (cesiumModule as unknown as { default?: () => Plugin }).default ??
    (cesiumModule as unknown as () => Plugin)
  )

export default defineConfig({
  plugins: [
    react(),
    cesiumPlugin(),
  ],

  server: {
    watch: {
      ignored: [
        '**/public/maps/**',
        '**/maps/**',
      ],
    },
  },
})