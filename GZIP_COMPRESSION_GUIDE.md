# GZIP Compression Configuration Guide

## Overview

GZIP compression reduces file sizes significantly during transfer, improving page load times. This guide covers server configurations for the most common deployment environments.

## Before and After File Size Examples

### Without GZIP Compression
- `styles.min.css`: ~8.5 KB
- `script.min.js`: ~0.3 KB
- `index.html`: ~18 KB
- **Total**: ~26.8 KB

### With GZIP Compression (typically 60-80% reduction)
- `styles.min.css`: ~2.0 KB
- `script.min.js`: ~0.15 KB
- `index.html`: ~4.5 KB
- **Total**: ~6.65 KB

**Compression ratio: ~75% reduction in transfer size**

---

## Apache Server (.htaccess)

Add this configuration to your `.htaccess` file in the root directory:

```apache
<IfModule mod_deflate.c>
  # Compress HTML, CSS, JavaScript, Text, XML and fonts
  AddOutputFilterByType DEFLATE text/plain
  AddOutputFilterByType DEFLATE text/html
  AddOutputFilterByType DEFLATE text/xml
  AddOutputFilterByType DEFLATE text/css
  AddOutputFilterByType DEFLATE text/javascript
  AddOutputFilterByType DEFLATE application/xml
  AddOutputFilterByType DEFLATE application/xhtml+xml
  AddOutputFilterByType DEFLATE application/rss+xml
  AddOutputFilterByType DEFLATE application/javascript
  AddOutputFilterByType DEFLATE application/x-javascript
  AddOutputFilterByType DEFLATE application/x-font-ttf
  AddOutputFilterByType DEFLATE application/x-font-opentype
  AddOutputFilterByType DEFLATE application/vnd.ms-fontobject
  AddOutputFilterByType DEFLATE image/svg+xml

  # Remove browser bugs (only needed for very old browsers)
  BrowserMatch ^Mozilla/4 no-gzip
  BrowserMatch ^Mozilla/4\.0[678] no-gzip
  BrowserMatch \bMSIE !no-gzip !gzip-only-text/html
  BrowserMatch \bMSI[E] !no-gzip !gzip-only-text/html
</IfModule>

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresDefault "access plus 2 days"
  ExpiresByType text/html "access plus 2 hours"
  ExpiresByType text/css "access plus 30 days"
  ExpiresByType text/javascript "access plus 30 days"
  ExpiresByType application/javascript "access plus 30 days"
  ExpiresByType image/png "access plus 30 days"
  ExpiresByType image/jpeg "access plus 30 days"
  ExpiresByType image/gif "access plus 30 days"
  ExpiresByType image/webp "access plus 30 days"
</IfModule>
```

### Apache Prerequisites

Ensure these modules are enabled:
```bash
sudo a2enmod deflate
sudo a2enmod expires
sudo systemctl restart apache2
```

---

## Nginx Configuration

Add this to your `nginx.conf` or server block:

```nginx
http {
  # Enable gzip compression
  gzip on;
  gzip_min_length 1000;  # Don't compress files smaller than 1KB
  gzip_proxied any;
  gzip_types
    text/plain
    text/css
    text/xml
    text/javascript
    application/x-javascript
    application/xml+rss
    application/rss+xml
    application/javascript
    application/json
    image/svg+xml
    font/truetype
    font/opentype
    application/vnd.ms-fontobject
    application/x-font-ttf;

  # Compression level (1-9, default 6)
  gzip_comp_level 6;

  # Vary header for proxies
  gzip_vary on;

  # Cache settings
  expires 2d;
  add_header Cache-Control "public, max-age=172800";

  location ~* \.(css|js|json|xml|txt)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
  }

  location ~* \.(html)$ {
    expires 2h;
    add_header Cache-Control "public, must-revalidate";
  }
}

server {
  listen 80;
  server_name japrinthaus.com www.japrinthaus.com;

  # Your server configuration here...
}
```

### Nginx Verification

Reload Nginx after making changes:
```bash
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

---

## Node.js / Express Setup

### Using compression middleware

```javascript
const express = require('express');
const compression = require('compression');
const app = express();

// Enable gzip compression
app.use(compression({
  level: 6,  // Compression level (0-9)
  threshold: 1000,  // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Serve static files with appropriate cache headers
app.use(express.static('public', {
  maxAge: '30d',
  etag: false
}));

// Set cache control headers for HTML
app.use((req, res, next) => {
  if (req.url.endsWith('.html')) {
    res.setHeader('Cache-Control', 'public, max-age=7200');
  }
  next();
});

app.listen(3000, () => {
  console.log('Server running on port 3000 with GZIP compression enabled');
});
```

### Installation

```bash
npm install compression
```

### Alternative: Using fastify-compress

```javascript
const fastify = require('fastify');
const compress = require('@fastify/compress');

const app = fastify();

app.register(compress, {
  threshold: 1000,
  encodings: ['gzip', 'deflate']
});

app.register(require('@fastify/static'), {
  root: 'public',
  constraints: {}
});

app.listen({ port: 3000 }, (err, address) => {
  if (err) throw err;
  console.log(`Server listening at ${address}`);
});
```

---

## Testing GZIP Compression

### Using curl

```bash
# Check if GZIP is enabled (should see Content-Encoding: gzip)
curl -H "Accept-Encoding: gzip" -I https://japrinthaus.com/

# Download compressed file
curl -H "Accept-Encoding: gzip" -o index.html.gz https://japrinthaus.com/
ls -lh index.html.gz
```

### Using online tools

- WebPageTest: https://www.webpagetest.org/
- GTmetrix: https://gtmetrix.com/
- Lighthouse (Chrome DevTools): Press F12 → Lighthouse tab

### Using Node.js script

```javascript
const https = require('https');
const zlib = require('zlib');

https.get('https://japrinthaus.com/', {
  headers: { 'Accept-Encoding': 'gzip' }
}, (res) => {
  let size = 0;

  if (res.headers['content-encoding'] === 'gzip') {
    res.pipe(zlib.createGunzip())
      .on('data', (chunk) => {
        size += chunk.length;
      })
      .on('end', () => {
        console.log('Uncompressed size:', size, 'bytes');
        console.log('Compressed size:', res.headers['content-length'], 'bytes');
        console.log('Compression ratio:',
          ((1 - res.headers['content-length']/size) * 100).toFixed(2) + '%');
      });
  } else {
    console.log('GZIP not enabled');
  }
});
```

### Command-line verification

```bash
# Show response headers
curl -I https://japrinthaus.com/

# Full response with headers
curl -v https://japrinthaus.com/ 2>&1 | grep -i "content-encoding"
```

---

## Monitoring and Best Practices

### Recommended Compression Levels

- **Level 1-3**: Fastest, lower compression (use for real-time APIs)
- **Level 4-6**: Balanced (recommended for most sites)
- **Level 7-9**: Slowest, highest compression (use for static assets)

### File Size Thresholds

- Don't compress files smaller than 860 bytes (overhead exceeds benefits)
- Our recommendation: Set threshold to 1000-1500 bytes

### Cache Considerations

```
Cache-Control Headers by File Type:

HTML:          max-age=7200 (2 hours)
CSS/JS:        max-age=2592000 (30 days)
Images:        max-age=2592000 (30 days)
Fonts:         max-age=31536000 (1 year)
```

### Monitoring Performance

1. **Before deploying**, run a baseline test using WebPageTest or Lighthouse
2. **After enabling GZIP**, re-run tests to verify improvements
3. **Monitor** with real user monitoring (RUM) tools like Sentry or New Relic

### Expected Improvements

- CSS files: 60-75% reduction
- JavaScript files: 65-85% reduction
- HTML pages: 50-70% reduction
- Overall page load time: 20-30% faster

---

## Troubleshooting

### GZIP Not Working

1. Check if module/middleware is installed and enabled
2. Verify file size is above the compression threshold
3. Check `Accept-Encoding: gzip` header is being sent
4. Review server logs for errors
5. Clear browser cache and test in incognito mode

### Double Compression Issues

If using both Apache and PHP gzip, or multiple middleware:
- Disable one compression layer to avoid conflicts
- Check error logs for duplicate Content-Encoding headers

### Browser Compatibility

GZIP is supported in all modern browsers (IE 6+). No client-side configuration needed.

---

## Summary

Enabling GZIP compression is one of the most effective performance optimizations:
- Typical 70-80% reduction in transfer size
- Works transparently with browsers
- Zero performance cost after initial deployment
- Highly recommended for any production website

For J&A Printhaus:
- **Before**: ~26.8 KB total assets
- **After**: ~6.65 KB total assets
- **Savings**: ~20 KB per page load across all visitors
