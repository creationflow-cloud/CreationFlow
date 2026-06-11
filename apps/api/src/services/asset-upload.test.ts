import { describe, expect, it } from "vitest";

import { sanitizeSvg } from "./asset-upload.js";

function toBytes(svg: string): Uint8Array {
  return new TextEncoder().encode(svg);
}

describe("SVG sanitization", () => {
  it("accepts valid minimal SVG", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="0" y="0" width="50" height="50" fill="red"/></svg>`;
    const result = sanitizeSvg(toBytes(svg));
    const text = new TextDecoder().decode(result);
    expect(text).toContain("<svg");
    expect(text).toContain("<rect");
  });

  it("strips script tags", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert('xss')</script><rect/></svg>`;
    const result = sanitizeSvg(toBytes(svg));
    const text = new TextDecoder().decode(result);
    expect(text).not.toContain("script");
    expect(text).not.toContain("alert");
  });

  it("strips foreignObject", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div onclick="alert(1)">x</div></foreignObject><rect/></svg>`;
    const result = sanitizeSvg(toBytes(svg));
    const text = new TextDecoder().decode(result);
    expect(text).not.toContain("foreignObject");
    expect(text).not.toContain("onclick");
  });

  it("strips on* event handlers", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><rect onclick="alert(1)" onload="x" width="10" height="10"/></svg>`;
    const result = sanitizeSvg(toBytes(svg));
    const text = new TextDecoder().decode(result);
    expect(text).not.toContain("onclick");
    expect(text).not.toContain("onload");
  });

  it("preserves safe attributes like fill, stroke, d", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M 0 0 L 100 100" fill="blue" stroke="red"/></svg>`;
    const result = sanitizeSvg(toBytes(svg));
    const text = new TextDecoder().decode(result);
    expect(text).toContain("fill");
    expect(text).toContain("stroke");
  });

  it("preserves gradient and pattern elements", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><stop offset="0" stop-color="red"/></defs><rect fill="url(#g)" width="100" height="100"/></svg>`;
    const result = sanitizeSvg(toBytes(svg));
    const text = new TextDecoder().decode(result);
    expect(text).toContain("stop");
    expect(text).toContain("rect");
  });
});
