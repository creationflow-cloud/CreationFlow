import { describe, expect, it } from "vitest";

import { PdfValidationError, sanitizeSvg, validatePdf } from "./asset-upload.js";

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

  it("strips style attribute to prevent CSS injection", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><rect style="background:url(javascript:alert(1))" width="10" height="10"/></svg>`;
    const result = sanitizeSvg(toBytes(svg));
    const text = new TextDecoder().decode(result);
    expect(text).not.toContain("style=");
    expect(text).not.toContain("javascript:");
  });

  it("strips animate elements that can carry event handlers", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><animate attributeName="x" onBegin="alert(1)" to="100"/><rect/></svg>`;
    const result = sanitizeSvg(toBytes(svg));
    const text = new TextDecoder().decode(result);
    expect(text).not.toContain("animate");
    expect(text).not.toContain("onBegin");
  });

  it("strips iframe, embed, object, form, input, button, textarea", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><iframe src="javascript:alert(1)"/><embed src="x"/><object data="x"/><form><input/><button/><textarea/><select><option/></select></form><link rel="x"/><meta/><base href="x"/><video src="x"/><audio src="x"/><source src="x"/><track/></svg>`;
    const result = sanitizeSvg(toBytes(svg));
    const text = new TextDecoder().decode(result);
    expect(text).not.toContain("iframe");
    expect(text).not.toContain("embed");
    expect(text).not.toContain("object");
    expect(text).not.toContain("form");
    expect(text).not.toContain("input");
    expect(text).not.toContain("button");
    expect(text).not.toContain("textarea");
    expect(text).not.toContain("select");
    expect(text).not.toContain("option");
    expect(text).not.toContain("link");
    expect(text).not.toContain("meta");
    expect(text).not.toContain("base");
    expect(text).not.toContain("video");
    expect(text).not.toContain("audio");
    expect(text).not.toContain("source");
    expect(text).not.toContain("track");
  });

  it("strips data: URLs in href and xlink:href", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><a href="data:text/html,<script>alert(1)</script>"><rect/></a><use xlink:href="data:image/svg+xml,<svg/>"/></svg>`;
    const result = sanitizeSvg(toBytes(svg));
    const text = new TextDecoder().decode(result);
    expect(text).not.toContain("data:text/html");
    expect(text).not.toContain("data:image/svg");
  });
});

function padBytes(data: Uint8Array, length: number): Uint8Array {
  if (data.byteLength >= length) return data;
  const padded = new Uint8Array(length);
  padded.set(data);
  return padded;
}

function makeMinimalPdf(): Uint8Array {
  const header = "%PDF-1.4\n";
  const body = "%¥±ë\n1 0 obj\n<<>>\nendobj\n";
  const filler = "0".repeat(500);
  const trailer = "trailer\n<<>>\nstartxref\n0\n%%EOF";
  return new TextEncoder().encode(header + body + filler + trailer);
}

describe("PDF validation", () => {
  it("accepts a minimal valid PDF", () => {
    expect(() => validatePdf(makeMinimalPdf())).not.toThrow();
  });

  it("rejects file without %PDF- header", () => {
    const fake = new TextEncoder().encode("not a pdf");
    expect(() => validatePdf(padBytes(fake, 300))).toThrow(PdfValidationError);
  });

  it("rejects file without %%EOF trailer", () => {
    const body = "%PDF-1.4\nblah";
    expect(() => validatePdf(padBytes(new TextEncoder().encode(body), 300))).toThrow(
      PdfValidationError,
    );
  });

  it("rejects too-small files", () => {
    const tiny = new TextEncoder().encode("%PDF-1.4\n%%EOF");
    expect(() => validatePdf(tiny)).toThrow(PdfValidationError);
  });

  it("accepts PDF with CRLF line endings before %%EOF", () => {
    const header = "%PDF-1.4\n";
    const filler = "x".repeat(250);
    const trailer = "%%EOF\r\n";
    expect(() => validatePdf(new TextEncoder().encode(header + filler + trailer))).not.toThrow();
  });
});
