const { createServer } = require('http')
const { createServer: createHttpsServer } = require('https')
const { parse } = require('url')
const fs = require('fs')
const next = require('next')

const dev = false
const hostname = '127.0.0.1'
const port = 3000
const httpsPort = 3443

// Check for SSL certificates for HTTPS/TLS 1.3
const sslKeyPath = process.env.SSL_KEY_PATH || './certs/key.pem'
const sslCertPath = process.env.SSL_CERT_PATH || './certs/cert.pem'
const useHTTPS = process.env.USE_HTTPS === 'true' && fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

const addSecurityHeaders = (res) => {
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.setHeader('Server', '') // Hide server name
  // HSTS header for HTTPS
  if (useHTTPS) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
}

app.prepare().then(() => {
  if (useHTTPS) {
    // HTTPS server with TLS 1.3 support
    const options = {
      key: fs.readFileSync(sslKeyPath),
      cert: fs.readFileSync(sslCertPath),
      minVersion: 'TLSv1.3', // Enforce TLS 1.3
      ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256'
    }

    createHttpsServer(options, async (req, res) => {
      addSecurityHeaders(res)
      try {
        const parsedUrl = parse(req.url, true)
        await handle(req, res, parsedUrl)
      } catch (err) {
        console.error('Error occurred handling', req.url, err)
        res.statusCode = 500
        res.end('internal server error')
      }
    })
      .once('error', (err) => {
        console.error(err)
        process.exit(1)
      })
      .listen(httpsPort, () => {
        console.log(`> Ready on https://${hostname}:${httpsPort} (TLS 1.3)`)
      })
  } else {
    // HTTP server (development mode)
    createServer(async (req, res) => {
      addSecurityHeaders(res)
      try {
        const parsedUrl = parse(req.url, true)
        await handle(req, res, parsedUrl)
      } catch (err) {
        console.error('Error occurred handling', req.url, err)
        res.statusCode = 500
        res.end('internal server error')
      }
    })
      .once('error', (err) => {
        console.error(err)
        process.exit(1)
      })
      .listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`)
        if (process.env.USE_HTTPS === 'true') {
          console.log('> Note: SSL certificates not found. Running in HTTP mode.')
          console.log('> To enable TLS 1.3, place SSL certificates at:')
          console.log(`  - Key: ${sslKeyPath}`)
          console.log(`  - Cert: ${sslCertPath}`)
        }
      })
  }
})
