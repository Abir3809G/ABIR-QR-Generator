// ---------- State ----------
let currentType = "text";
let logoDataUrl = null;

const previewEl = document.getElementById("qr-preview");

let qrCode = new QRCodeStyling({
  width: 400,
  height: 400,
  data: " ",
  margin: 8,
  qrOptions: { errorCorrectionLevel: "M" },
  dotsOptions: { color: "#000000", type: "square" },
  backgroundOptions: { color: "#ffffff" },
  imageOptions: { crossOrigin: "anonymous", margin: 6 },
});

qrCode.append(previewEl);

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
      const v = document.getElementById("f-text").value.trim();
      return v || "এখানে আপনার টেক্সট দেখাবে";
    }
    case "url": {
      let v = document.getElementById("f-url").value.trim();
      if (!v) return "https://example.com";
      if (!/^https?:\/\//i.test(v)) v = "https://" + v;
      return v;
    }
    case "wifi": {
      const ssid = document.getElementById("f-wifi-ssid").value.trim();
      const pass = document.getElementById("f-wifi-pass").value.trim();
      const enc = document.getElementById("f-wifi-enc").value;
      const hidden = document.getElementById("f-wifi-hidden").checked;
      const esc = (s) => s.replace(/([\\;,:"])/g, "\\$1");
      return `WIFI:T:${enc};S:${esc(ssid || "WiFi")};${enc === "nopass" ? "" : "P:" + esc(pass) + ";"}H:${hidden ? "true" : "false"};;`;
    }
    case "vcard": {
      const name = document.getElementById("f-vc-name").value.trim();
      const org = document.getElementById("f-vc-org").value.trim();
      const phone = document.getElementById("f-vc-phone").value.trim();
      const email = document.getElementById("f-vc-email").value.trim();
      const url = document.getElementById("f-vc-url").value.trim();
      const addr = document.getElementById("f-vc-address").value.trim();
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
      const to = document.getElementById("f-email-to").value.trim();
      const subject = encodeURIComponent(document.getElementById("f-email-subject").value.trim());
      const body = encodeURIComponent(document.getElementById("f-email-body").value.trim());
      let q = [];
      if (subject) q.push(`subject=${subject}`);
      if (body) q.push(`body=${body}`);
      return `mailto:${to}${q.length ? "?" + q.join("&") : ""}`;
    }
    case "phone": {
      const v = document.getElementById("f-phone").value.trim();
      return `tel:${v}`;
    }
    case "sms": {
      const number = document.getElementById("f-sms-number").value.trim();
      const body = document.getElementById("f-sms-body").value.trim();
      return `SMSTO:${number}:${body}`;
    }
    case "location": {
      const lat = document.getElementById("f-loc-lat").value.trim() || "0";
      const lng = document.getElementById("f-loc-lng").value.trim() || "0";
      return `geo:${lat},${lng}`;
    }
    default:
      return " ";
  }
}

// ---------- Render / update QR ----------
function renderQR() {
  const size = parseInt(document.getElementById("opt-size").value, 10) || 400;
  const ecc = document.getElementById("opt-ecc").value;
  const fg = document.getElementById("opt-fg").value;
  const bg = document.getElementById("opt-bg").value;
  const dotType = document.getElementById("opt-dots").value;

  qrCode.update({
    width: size,
    height: size,
    data: buildData(),
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
  "opt-size", "opt-ecc", "opt-fg", "opt-bg", "opt-dots",
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
    const size = parseInt(document.getElementById("opt-size").value, 10) || 400;

    // Convert px to mm roughly (assume 96dpi) for a nicely centered page
    const pxToMm = (px) => (px * 25.4) / 96;
    const imgMm = Math.min(pxToMm(size), 180);
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
renderQR();
