import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// GitHub Pages: https://dohoon0508.github.io/EngineerInformationProcessing_Knight/
const BASE = '/EngineerInformationProcessing_Knight/'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? BASE : '/',
}))
