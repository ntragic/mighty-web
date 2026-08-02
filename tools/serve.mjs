#!/usr/bin/env node
/** serve.mjs — web/ 을 정적 서빙한다 (의존성 없음). 기본 포트 8080. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'web');
const PORT = Number(process.argv[2] || process.env.PORT || 8080);
const MIME = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8', '.wasm':'application/wasm',
  '.onnx':'application/octet-stream', '.md':'text/markdown; charset=utf-8',
  '.json':'application/json', '.css':'text/css; charset=utf-8',
};

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const file = join(ROOT, p);
    if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
    const s = await stat(file);
    if (!s.isFile()) throw new Error('not a file');
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[extname(file)] || 'application/octet-stream',
      'Content-Length': s.size,
      'Cache-Control': 'no-cache',
    }).end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('not found');
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`http://localhost:${PORT}  (web/ 정적 서빙, Ctrl+C 종료)`);
  console.log('원격 접속 시 Tailscale IP로도 열린다: http://<tailscale-ip>:' + PORT);
});
