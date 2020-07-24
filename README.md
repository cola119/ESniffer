# ESniffer 🔬

Modern network analyze tool. Alternatives to Hoxy, Charles, etc.

## Install

```sh
npm i esniffer
yarn add esniffer
```

## Example

```js
// index.js
import ESniffer from "esniffer";
import fs from "fs";

// Required if you want to monitor over HTTPS
const key = fs.readFileSync(`path/to/root-key.pem`);
const cert = fs.readFileSync(`path/to/root-cert.pem`);

const proxy = ESniffer.createServer({ secure: { key, cert } });
proxy.listen(8080);

proxy.on("request", (req) => {
  req.pipe(process.stdout);
});
proxy.on("response", (res) => {
  res.pipe(process.stdout);
});
proxy.on("info", (info) => {
  console.log(info);
});
proxy.on("error", (e) => {
  console.error(e.message);
});
```

### Start and configure the proxy server

```sh
node index.js
```

In your mac, from `System Preferences > Network > Advanced... > Proxies tab`, configure the proxy as follows:

| Protocol                 | Host        | Port   |
| ------------------------ | ----------- | ------ |
| Web Proxy (HTTP)         | `127.0.0.1` | `8080` |
| Secure Web Proxy (HTTPS) | `127.0.0.1` | `8080` |

Finally, don't forget `OK` and `Apply`.

## Events

| name       | description                          | type                   |
| ---------- | ------------------------------------ | ---------------------- |
| `info`     | Logs of the proxy server             | `string`               |
| `error`    | Errors occurring on the proxy server | `Error`                |
| `request`  | Request object to the actual server  | `http.IncomingMessage` |
| `response` | Response object to the actual server | `http.IncomingMessage` |
