

# Zappy

Easy start
```shell
npm i
```
Setup game server at
```text
apps
└─api
   └─src
     └─environments
       └─environment.ts
```

```typescript
export const environment = {
  production: false,
  gameServer: {
    port: 9876, // port number
    host: '127.0.0.1', // ip or url
  },
};
```

Start dev server 
```shell
npm run simple
```
