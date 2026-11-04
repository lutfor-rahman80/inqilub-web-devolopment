import "server-only";
import QRCode from "qrcode";

/**
 * QR codes are generated on the server from an already-validated URL
 * (see safeFacebookUrl). The SVG string comes from the qrcode library, never
 * from user input, so it is safe to inline.
 */

/** Inline SVG for on-screen display (dark green on white, error correction M). */
export function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    color: { dark: "#04291aff", light: "#ffffffff" },
  });
}

/** High-resolution black-on-white PNG for printing (error correction Q, 4-module quiet zone). */
export function qrPng(url: string, width = 1024): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: "png",
    errorCorrectionLevel: "Q",
    margin: 4,
    width,
    color: { dark: "#000000ff", light: "#ffffffff" },
  });
}
