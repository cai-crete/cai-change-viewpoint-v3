import { defineConfig } from 'vite'
import type { ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// ── Dev-only: 오류 보고서를 docs/exec-plans/report/ 에 저장하는 미들웨어
// POST /api/save-error-report  { filename: string, content: string }
const errorReportPlugin = {
  name: 'n09-error-report-saver',
  configureServer(server: ViteDevServer) {
    server.middlewares.use('/api/save-error-report', (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405
        res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }))
        return
      }

      let body = ''
      req.on('data', (chunk) => { body += String(chunk) })
      req.on('end', () => {
        try {
          const { filename, content } = JSON.parse(body) as { filename: string; content: string }

          // 파일명 안전성 검사 (경로 traversal 방지)
          const safeName = path.basename(filename)
          const reportDir = path.resolve(process.cwd(), 'docs/exec-plans/report')
          fs.mkdirSync(reportDir, { recursive: true })

          const filePath = path.join(reportDir, safeName)
          fs.writeFileSync(filePath, content, 'utf-8')

          console.log(`\x1b[32m[N09 ErrorReport] Saved → ${filePath}\x1b[0m`)

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, path: filePath }))
        } catch (e) {
          console.error('[N09 ErrorReport] Save failed:', e)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: String(e) }))
        }
      })
    })
  },
}

export default defineConfig({
  plugins: [react(), errorReportPlugin],
})
