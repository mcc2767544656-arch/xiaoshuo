import { defineConfig } from 'vite';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createReadStream } from 'node:fs';
import { cp, stat } from 'node:fs/promises';
const pdfRoot = dirname(fileURLToPath(import.meta.resolve('pdfjs-dist/package.json')));
const resources = { '/pdf-cmaps/': 'cmaps', '/pdf-fonts/': 'standard_fonts', '/pdf-wasm/': 'wasm' };
export default defineConfig({
  plugins: [{
    name: 'pdf-local-resources',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const prefix = Object.keys(resources).find(key => req.url?.startsWith(key));
        if (!prefix) return next();
        const base = resolve(pdfRoot, resources[prefix]);
        let target;
        try { target = resolve(base, decodeURIComponent(req.url.split('?')[0].slice(prefix.length))); }
        catch { res.statusCode = 400; return res.end(); }
        if (!target.startsWith(base + sep)) { res.statusCode = 403; return res.end(); }
        try { if (!(await stat(target)).isFile()) return next(); }
        catch { return next(); }
        res.setHeader('Content-Type', target.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream');
        createReadStream(target).on('error', () => res.destroy()).pipe(res);
      });
    },
    async closeBundle() {
      await Promise.all(Object.entries(resources).map(([url, folder]) => cp(resolve(pdfRoot, folder), resolve('dist', url.slice(1)), { recursive: true })));
    },
  }],
});
