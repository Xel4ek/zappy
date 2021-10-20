export const environment = {
  production: true,
  ws:
    location.protocol.replace('http', 'ws') +
    '//' +
    location.hostname +
    ':' +
    location.port +
    '/ws',
};
