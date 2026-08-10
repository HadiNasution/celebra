import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("parses simple rows", () => {
    expect(parseCsv("name,phone\nAlice,0812\nBob,0813")).toEqual([
      ["name", "phone"],
      ["Alice", "0812"],
      ["Bob", "0813"],
    ]);
  });

  it("handles quoted fields with commas and quotes", () => {
    const csv = 'name,note\n"Doe, John","said ""hi"""\n';
    expect(parseCsv(csv)).toEqual([
      ["name", "note"],
      ["Doe, John", 'said "hi"'],
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("ignores trailing empty rows", () => {
    expect(parseCsv("a\n1\n\n\n")).toEqual([
      ["a"],
      ["1"],
    ]);
  });
});
