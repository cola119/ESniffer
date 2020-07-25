# Example

You should create self-signed certificates and install and trust this certifications on your Mac.

```sh
mkdir credentials && cd credentials

# generate a private key
openssl genrsa -out root-key.pem 1024

# generate a CSR
openssl req -new -key root-key.pem -out root-csr.pem

# sign and create a certificate with my private key
openssl x509 -req -in root-csr.pem -signkey root-key.pem -out root-cert.pem
```
