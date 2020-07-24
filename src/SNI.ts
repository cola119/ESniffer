import pem from "pem";
import tls, { CommonConnectionOptions, SecureContextOptions } from "tls";

const cache = new Map<string, any>();

export const SNICallback = (
  serviceKey: SecureContextOptions["key"],
  serviceCertificate: SecureContextOptions["cert"]
): CommonConnectionOptions["SNICallback"] => (serverName, cb) => {
  if (cache.has(serverName)) {
    const ctx = cache.get(serverName);
    return cb(null, ctx);
  }

  const key = serviceKey?.toString();
  if (!key) throw new Error("Root Key not found");

  pem.createCertificate(
    {
      country: "JP",
      state: "Tokyo",
      locality: "Shinjuku",
      commonName: serverName,
      altNames: [serverName],
      serviceKey: key,
      serviceCertificate,
      serial: Date.now(),
      days: 365,
    },
    (err, result) => {
      const { clientKey, certificate } = result;
      const ctx = tls.createSecureContext({
        key: clientKey,
        cert: certificate,
      });
      cache.set(serverName, ctx);
      cb(err, ctx);
    }
  );
};
