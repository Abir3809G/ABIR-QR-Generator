// ---------- State ----------
let currentType = "text";
let logoDataUrl = null;

const previewEl = document.getElementById("qr-preview");

let qrCode = new QRCodeStyling({
  width: 400,
  height: 400,
  data: " ",
  margin: 8,
  qrOptions: { errorCorrectionLevel: "Q" },
  dotsOptions: { color: "#000000", type: "square" },
  backgroundOptions: { color: "#ffffff" },
  imageOptions: { crossOrigin: "anonymous", margin: 6 },
});

qrCode.append(previewEl);

// ---------- Text sanitizer ----------
// Scanners often assume a simple ASCII/Latin-1 charset. "Smart" typographic
// characters (curly quotes, em/en dashes, ellipsis, non-breaking spaces,
// zero-width characters) frequently show up as garbled boxes on scan even
// though they display fine on screen. We normalize these to plain ASCII
// equivalents so the encoded QR data is scanner-safe everywhere, while still
// allowing full Bengali/Unicode text (that is handled natively via UTF-8).
function sanitizeText(str) {
  if (!str) return str;
  return str
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[   ]/g, " ")
    .replace(/[​-‍﻿]/g, "");
}

function val(id) {
  const el = document.getElementById(id);
  return sanitizeText((el.value || "").trim());
}

// The underlying QR engine encodes each JS string character as a single
// byte (it does not do proper multi-byte UTF-8 encoding on its own). For
// plain ASCII text that's harmless, but any non-ASCII character (Bengali,
// accented letters, etc.) gets silently corrupted. The fix is to convert
// the text into its real UTF-8 byte sequence first and feed the encoder a
// "binary string" where each character already represents exactly one of
// those bytes — this makes the final QR payload correct UTF-8 for every
// scanner, in every language.
function toQrPayload(str) {
  const bytes = new TextEncoder().encode(str);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

// ---------- Tabs ----------
const tabs = document.querySelectorAll(".tab");
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentType = tab.dataset.type;

    document.querySelectorAll("[data-form]").forEach((el) => {
      el.hidden = el.dataset.form !== currentType;
    });

    renderQR();
  });
});

// ---------- Helpers to build QR payload per type ----------
function buildData() {
  switch (currentType) {
    case "text": {
      const v = val("f-text");
      return v || "এখানে আপনার টেক্সট দেখাবে";
    }
    case "url": {
      let v = val("f-url");
      if (!v) return "https://example.com";
      if (!/^https?:\/\//i.test(v)) v = "https://" + v;
      return v;
    }
    case "wifi": {
      const ssid = val("f-wifi-ssid");
      const pass = val("f-wifi-pass");
      const enc = document.getElementById("f-wifi-enc").value;
      const hidden = document.getElementById("f-wifi-hidden").checked;
      const esc = (s) => s.replace(/([\\;,:"])/g, "\\$1");
      return `WIFI:T:${enc};S:${esc(ssid || "WiFi")};${enc === "nopass" ? "" : "P:" + esc(pass) + ";"}H:${hidden ? "true" : "false"};;`;
    }
    case "vcard": {
      const name = val("f-vc-name");
      const org = val("f-vc-org");
      const phone = val("f-vc-phone");
      const email = val("f-vc-email");
      const url = val("f-vc-url");
      const addr = val("f-vc-address");
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        name ? `N:${name};;;` : "",
        name ? `FN:${name}` : "",
        org ? `ORG:${org}` : "",
        phone ? `TEL;TYPE=CELL:${phone}` : "",
        email ? `EMAIL:${email}` : "",
        url ? `URL:${url}` : "",
        addr ? `ADR:;;${addr};;;;` : "",
        "END:VCARD",
      ]
        .filter(Boolean)
        .join("\n");
    }
    case "email": {
      const to = val("f-email-to");
      const subject = encodeURIComponent(val("f-email-subject"));
      const body = encodeURIComponent(val("f-email-body"));
      let q = [];
      if (subject) q.push(`subject=${subject}`);
      if (body) q.push(`body=${body}`);
      return `mailto:${to}${q.length ? "?" + q.join("&") : ""}`;
    }
    case "phone": {
      const v = val("f-phone");
      return `tel:${v}`;
    }
    case "sms": {
      const number = val("f-sms-number");
      const body = val("f-sms-body");
      return `SMSTO:${number}:${body}`;
    }
    case "location": {
      const lat = val("f-loc-lat") || "0";
      const lng = val("f-loc-lng") || "0";
      return `geo:${lat},${lng}`;
    }
    default:
      return " ";
  }
}

// ---------- Size / unit handling ----------
// We keep one true value in pixels (assuming 96px = 1in, the standard CSS
// reference pixel) and convert to/from whichever unit the user picks.
const PX_PER_INCH = 96;

function toPx(value, unit) {
  switch (unit) {
    case "in":
      return value * PX_PER_INCH;
    case "cm":
      return (value / 2.54) * PX_PER_INCH;
    case "mm":
      return (value / 25.4) * PX_PER_INCH;
    default:
      return value;
  }
}

function fromPx(px, unit) {
  switch (unit) {
    case "in":
      return px / PX_PER_INCH;
    case "cm":
      return (px / PX_PER_INCH) * 2.54;
    case "mm":
      return (px / PX_PER_INCH) * 25.4;
    default:
      return px;
  }
}

function roundForUnit(value, unit) {
  return unit === "px" ? Math.round(value) : Math.round(value * 100) / 100;
}

function getSizePx() {
  const widthInput = document.getElementById("opt-width");
  const unit = document.getElementById("opt-unit").value;
  const rawValue = parseFloat(widthInput.value);
  const value = isNaN(rawValue) || rawValue <= 0 ? 400 : rawValue;
  let px = toPx(value, unit);
  // Keep things sane: clamp rendered pixel size between 80px and 4000px.
  px = Math.min(Math.max(px, 80), 4000);
  return px;
}

function syncHeightField() {
  document.getElementById("opt-height").value = document.getElementById("opt-width").value;
}

document.getElementById("opt-width").addEventListener("input", () => {
  syncHeightField();
  renderQR();
});

document.getElementById("opt-unit").addEventListener("change", (e) => {
  // Convert the currently displayed value into the newly selected unit so
  // the physical size stays (roughly) the same instead of jumping.
  const widthInput = document.getElementById("opt-width");
  const prevUnit = e.target.dataset.prevUnit || "px";
  const newUnit = e.target.value;
  const rawValue = parseFloat(widthInput.value);
  const value = isNaN(rawValue) || rawValue <= 0 ? 400 : rawValue;
  const px = toPx(value, prevUnit);
  const converted = roundForUnit(fromPx(px, newUnit), newUnit);
  widthInput.value = converted;
  e.target.dataset.prevUnit = newUnit;
  syncHeightField();
  renderQR();
});
document.getElementById("opt-unit").dataset.prevUnit = "px";

// ---------- Render / update QR ----------
function renderQR() {
  const size = getSizePx();
  const fg = document.getElementById("opt-fg").value;
  const bg = document.getElementById("opt-bg").value;
  const dotType = document.getElementById("opt-dots").value;
  // No manual error-correction control: use High when a logo is present
  // (so the overlay doesn't break scannability) and Quartile otherwise,
  // a solid, reliable default for everyday use.
  const ecc = logoDataUrl ? "H" : "Q";

  qrCode.update({
    width: size,
    height: size,
    data: toQrPayload(buildData()),
    qrOptions: { errorCorrectionLevel: ecc },
    dotsOptions: { color: fg, type: dotType },
    backgroundOptions: { color: bg },
    image: logoDataUrl || undefined,
  });
}

// ---------- Wire up all inputs ----------
const watchIds = [
  "f-text", "f-url",
  "f-wifi-ssid", "f-wifi-pass", "f-wifi-enc", "f-wifi-hidden",
  "f-vc-name", "f-vc-org", "f-vc-phone", "f-vc-email", "f-vc-url", "f-vc-address",
  "f-email-to", "f-email-subject", "f-email-body",
  "f-phone",
  "f-sms-number", "f-sms-body",
  "f-loc-lat", "f-loc-lng",
  "opt-fg", "opt-bg", "opt-dots",
];

watchIds.forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  const evt = el.tagName === "SELECT" || el.type === "checkbox" || el.type === "color" ? "change" : "input";
  el.addEventListener(evt, renderQR);
});

document.getElementById("opt-logo").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) {
    logoDataUrl = null;
    renderQR();
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    logoDataUrl = reader.result;
    renderQR();
  };
  reader.readAsDataURL(file);
});

// ---------- Downloads ----------
document.getElementById("dl-png").addEventListener("click", () => {
  qrCode.download({ name: "qr-code", extension: "png" });
});

document.getElementById("dl-jpg").addEventListener("click", () => {
  qrCode.download({ name: "qr-code", extension: "jpeg" });
});

document.getElementById("dl-svg").addEventListener("click", () => {
  qrCode.download({ name: "qr-code", extension: "svg" });
});

document.getElementById("dl-pdf").addEventListener("click", async () => {
  const blob = await qrCode.getRawData("png");
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const { jsPDF } = window.jspdf;

    // Use the exact physical size the user chose (converted straight to mm)
    // so the printed QR matches their selected unit precisely.
    const widthInput = document.getElementById("opt-width");
    const unit = document.getElementById("opt-unit").value;
    const rawValue = parseFloat(widthInput.value);
    const value = isNaN(rawValue) || rawValue <= 0 ? 400 : rawValue;
    const px = Math.min(Math.max(toPx(value, unit), 80), 4000);
    const imgMm = Math.min(fromPx(px, "mm"), 400);
    const pageSize = imgMm + 40;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [pageSize, pageSize],
    });

    const offset = (pageSize - imgMm) / 2;
    pdf.addImage(dataUrl, "PNG", offset, offset, imgMm, imgMm);
    pdf.save("qr-code.pdf");
  };
  reader.readAsDataURL(blob);
});

// ---------- Initial render ----------
syncHeightField();
renderQR();
