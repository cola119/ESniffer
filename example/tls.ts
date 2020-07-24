import ESniffer from "../dist/index";
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
proxy.on("info", (info) => {
  console.log(info);
});
proxy.on("error", (e) => {
  console.error(e.message);
});
