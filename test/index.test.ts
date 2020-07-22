import ESniffer from "../src/index";

describe("sample", () => {
  it("test", () => {
    const proxy = ESniffer.createServer().listen(8080);
  });
});
