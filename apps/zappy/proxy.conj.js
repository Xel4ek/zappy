const PROXY_CONFIG = [
  {
    context: (pathname, req) => /^\/api/.test(pathname),
    target: {
      host: 'localhost',
      protocol: 'http:',
      port: 3333,
    },
    secure: false,
    logLevel: 'debug',
    changeOrigin: true,
  },
  {
    context: (pathname, req) => /^\/ws/.test(pathname),
    target: {
      host: 'localhost',
      protocol: 'ws:',
      port: 3333,
    },
    ws: true,
    pathRewrite: { '^/ws': '/' },
    secure: true,
    logLevel: 'debug',
    changeOrigin: true,
  },
];

module.exports = PROXY_CONFIG;
