const http = require('http');
const fs = require('fs');
const path = require('path');
const port = process.env.PORT || 3000;

// Allowed file extensions (whitelist)
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

// Security headers
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};

http.createServer((req, res) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.writeHead(405, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  // Parse URL and remove query string
  const urlPath = req.url.split('?')[0];
  const filePath = urlPath === '/' ? 'index.html' : urlPath.slice(1);

  // Decode URI components safely
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(filePath);
  } catch {
    res.writeHead(400, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain' });
    res.end('Bad Request');
    return;
  }

  // SECURITY: Resolve the full path and ensure it stays within __dirname
  const fullPath = path.resolve(__dirname, decodedPath);
  if (!fullPath.startsWith(path.resolve(__dirname))) {
    res.writeHead(403, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // SECURITY: Check file extension against whitelist
  const ext = path.extname(fullPath).toLowerCase();
  if (!MIME_TYPES[ext]) {
    res.writeHead(403, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain' });
    res.end('Forbidden: file type not allowed');
    return;
  }

  // SECURITY: Block hidden files and directories (dotfiles)
  if (decodedPath.split(/[/\\]/).some(part => part.startsWith('.'))) {
    res.writeHead(403, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': MIME_TYPES[ext],
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400'
    });
    res.end(data);
  });
}).listen(port, () => console.log(`Server running on port ${port}`));
