import http, { IncomingMessage } from "http";
import https, { ServerOptions } from "https";
import { SecureContextOptions } from "tls";
import { SNICallback } from "./SNI";
import net, { Socket } from "net";
import { isValidAddress } from "./utils";

type Opt = {
  secure?: {
    key: SecureContextOptions["key"];
    cert: SecureContextOptions["cert"];
  };
};

class ESniffer {
  createSpoofingServer: (
    reqListener: http.RequestListener
  ) => http.Server | https.Server;

  constructor(opt?: Opt) {
    this.createSpoofingServer = (reqListener: http.RequestListener) => {
      if (!opt?.secure) return http.createServer(reqListener);
      const tlsOpt: ServerOptions = {
        ...opt.secure,
        SNICallback: SNICallback(opt.secure.key, opt.secure.cert),
      };
      return https.createServer(tlsOpt, reqListener);
    };
  }

  listen(port: number) {
    const proxyServer = http.createServer((fromClient, toClient) => {
      if (!fromClient.url) throw new Error("Target URL not found.");
      // TODO: http or https
      const toServer = https.request(fromClient.url, (fromServer) => {
        toClient.writeHead(fromServer.statusCode || 500, fromServer.headers);
        fromServer.pipe(toClient, { end: true });
      });
      fromClient.pipe(toServer, { end: true });
    });

    const spoofingServer = this.createSpoofingServer((fromClient, toClient) => {
      const proxyAddress = proxyServer.address();
      if (!isValidAddress(proxyAddress)) {
        throw new Error(`Invalid proxy address: ${proxyAddress}`);
      }
      const toProxyServer = http.request(
        {
          port: proxyAddress.port,
          method: fromClient.method,
          headers: fromClient.headers,
          path: `https://${fromClient.headers.host}${fromClient.url}`,
        },
        (fromServer) => {
          toClient.writeHead(fromClient.statusCode || 500, fromServer.headers);
          fromServer.pipe(toClient, { end: true });
        }
      );
      fromClient.pipe(toProxyServer); // not end?
      // WIP error handling
    });

    // WIP: need to wait?
    proxyServer.listen(port, "127.0.0.1", () => {
      console.log(`Proxy Server start listening: localhost:${port}`);
    });
    spoofingServer.listen(0, "127.0.0.1", () => {
      console.log(`Spoofing Server start listening: localhost:0`);
    });

    proxyServer.on(
      "connect",
      (_: IncomingMessage, clientSocket: Socket, head: Buffer) => {
        console.log("CONNECT method");
        const spoofingServerAddress = spoofingServer.address();
        if (!isValidAddress(spoofingServerAddress)) {
          throw new Error(`Invalid proxy address: ${spoofingServerAddress}`);
        }
        const serverSocket = net.connect(
          spoofingServerAddress.port,
          spoofingServerAddress.address
        );
        serverSocket.on("connect", () => {
          clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
          clientSocket.write(head);
          clientSocket.pipe(serverSocket).pipe(clientSocket);
        });
      }
    );
  }
}

export default {
  ESniffer,
  createServer: (opt?: Opt) => {
    return new ESniffer(opt);
  },
};
