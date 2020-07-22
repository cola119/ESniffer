import ESniffer from "../src/index";
import fs from "fs";

const key = fs.readFileSync(`${__dirname}/credentials/root-key.pem`);
const cert = fs.readFileSync(`${__dirname}/credentials/root-cert.pem`);

const proxy = ESniffer.createServer({ secure: { key, cert } });
proxy.listen(8080);
