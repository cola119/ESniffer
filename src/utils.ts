import { AddressInfo } from "net";

export const isValidAddress = (
  addr: AddressInfo | string | null
): addr is AddressInfo => typeof addr !== "string" && !!addr && !!addr?.port;
