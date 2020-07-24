# ESniffer 🔬

Modern network analyze tool. Alternatives to Hoxy, Charles, etc.

## Example

```ts
import ESniffer from "esniffer";
import fs from "fs";

const key = fs.readFileSync(`${__dirname}/credentials/root-key.pem`);
const cert = fs.readFileSync(`${__dirname}/credentials/root-cert.pem`);

const proxy = ESniffer.createServer({ secure: { key, cert } });
proxy.listen(8080);

proxy.on("request", (req) => {
  req.pipe(process.stdout);
});
proxy.on("response", (res) => {
  res.pipe(process.stdout);
});
```
