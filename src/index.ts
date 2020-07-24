import StrictEventEmitter from "strict-event-emitter-types";
import http, { IncomingMessage } from "http";
import https, { ServerOptions } from "https";
import { SecureContextOptions } from "tls";
import { SNICallback } from "./SNI";
import net, { Socket } from "net";
import { isValidAddress } from "./utils";
import { EventEmitter } from "events";

type Opt = {
  secure?: {
    key: SecureContextOptions["key"];
    cert: SecureContextOptions["cert"];
  };
};

const EventType = {
  LOG: "log",
  ERROR: "error",
  REQUEST: "request",
  RESPONSE: "response",
  INFO: "info",
} as const;

interface ESnifferEvent {
  [EventType.RESPONSE]: (response: http.IncomingMessage) => void;
  [EventType.REQUEST]: (request: http.IncomingMessage) => void;
  [EventType.INFO]: (info: string) => void;
  [EventType.ERROR]: (error: Error) => void;
}

type ESnifferEmitter = StrictEventEmitter<EventEmitter, ESnifferEvent>;

class ESniffer extends (EventEmitter as { new (): ESnifferEmitter }) {
  private proxyServer: http.Server;
  private spoofingServer: http.Server;

  constructor(opt?: Opt) {
    super();
    this.proxyServer = http.createServer((fromClient, toClient) => {
      if (!fromClient.url) throw new Error("Target URL not found.");
      const url = new URL(fromClient.url);
      const h = url.protocol.startsWith("https") ? https : http;
      this.emit(EventType.REQUEST, fromClient);
      const toServer = h.request(
        {
          headers: fromClient.headers,
          protocol: url.protocol,
          method: fromClient.method,
          port: url.port,
          path: fromClient.url,
          hostname: url.hostname,
        },
        (fromServer) => {
          this.emit(EventType.RESPONSE, fromServer);
          toClient.writeHead(fromServer.statusCode || 500, fromServer.headers);
          fromServer.pipe(toClient, { end: true });
        }
      );
      fromClient.pipe(toServer, { end: true });
    });

    const createSpoofingServer = (reqListener: http.RequestListener) => {
      if (!opt?.secure) return http.createServer(reqListener);
      const tlsOpt: ServerOptions = {
        ...opt.secure,
        SNICallback: SNICallback(opt.secure.key, opt.secure.cert),
      };
      return https.createServer(tlsOpt, reqListener);
    };

    this.spoofingServer = createSpoofingServer((fromClient, toClient) => {
      const proxyAddress = this.proxyServer.address();
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
          toClient.writeHead(fromServer.statusCode || 500, fromServer.headers);
          fromServer.pipe(toClient, { end: true });
          toProxyServer.end();
        }
      );
      fromClient.pipe(toProxyServer);
    });
  }

  listen(port: number) {
    this.proxyServer.listen(port, "127.0.0.1", () => {
      this.emit(
        EventType.INFO,
        `Proxy Server start listening: localhost:${port}`
      );
    });
    this.spoofingServer.listen(0, "127.0.0.1", () => {
      this.emit(EventType.INFO, `Spoofing Server start listening: localhost:0`);
    });

    this.proxyServer.on(
      "connect",
      (_: IncomingMessage, clientSocket: Socket, head: Buffer) => {
        console.log("CONNECT method");
        const spoofingServerAddress = this.spoofingServer.address();
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

    this.proxyServer.on("error", (e) => {
      this.emit(EventType.ERROR, e);
    });
    this.spoofingServer.on("error", (e) => {
      this.emit(EventType.ERROR, e);
    });
    this.spoofingServer.on("tlsClientError", (e) => {
      this.emit(EventType.ERROR, e);
    });
    process.on("uncaughtException", (e) => {
      this.emit(EventType.ERROR, e);
    });
  }
}

export default {
  ESniffer,
  createServer: (opt?: Opt) => {
    return new ESniffer(opt);
  },
};
