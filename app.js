const STORAGE_KEY = "studentData";
const HMAC_KEY = "ang_magfoforge_ipapako_sa_krus"; 
let timer;

// ---- Utils ----
function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(data, key = HMAC_KEY) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  return toHex(sigBuffer); 
}

// ---- Registration ----
function registerStudent() {
  const student = {
    name: document.getElementById("name").value.trim(),
    id: document.getElementById("studentId").value.trim(),
    section: document.getElementById("section").value,
    email: document.getElementById("email").value.trim(),
    gender: document.getElementById("gender").value,
    phoneNumber: document.getElementById("phone").value.trim(),
  };

  if (
    !student.name ||
    !student.id ||
    student.section === "Select Section" ||
    !student.email ||
    student.gender === "Select Gender" ||
    !student.phoneNumber
  ) {
    alert("Please fill in all fields.");
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(student));
  document.getElementById("registration-card").style.display = "none";
  document.getElementById("qr-card").style.display = "block";
}

// ---- QR Generation (valid until end of day) ----
async function generateQr() {
  const student = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (!student) {
    alert("No student registered");
    return;
  }

  const now = Date.now();
  const midnight = new Date();
  midnight.setHours(23, 59, 59, 999);
  const expires = midnight.getTime();
  const nonce = crypto.randomUUID();

  const unsigned = `${student.name}|${student.id}|${student.section}|${student.email}|${student.gender}|${student.phoneNumber}|${now}|${expires}|${nonce}`;
  const sig = await hmacSha256(unsigned);

  const payload = {
    id: student.name,
    name: student.id,
    section: student.section,
    email: student.email,
    gender: student.gender,
    phoneNumber: student.phoneNumber,
    issuedAt: now,
    expiresAt: expires,
    nonce,
    sig
  };

  // Render QR
  const qrEl = document.getElementById("qrcode");
  qrEl.innerHTML = "";
  new QRCode(qrEl, {
    text: JSON.stringify(payload),
    width: 200,
    height: 200
  });
  qrEl.style.display = "block";

  // Countdown until midnight (H:M:S)
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    const diff = expires - Date.now();
    if (diff <= 0) {
      clearInterval(timer);
      document.getElementById("countdown").textContent = "⏰ QR expired (new day)";
      qrEl.style.display = "none";
      return;
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    document.getElementById("countdown").textContent =
      `QR valid for: ${hours}h ${minutes}m ${seconds}s`;
  }, 1000);
}


async function validateQrPayload(obj) {
  try {

    const unsigned = `${obj.id}|${obj.name}|${obj.section}|${obj.email}|${obj.gender}|${obj.phoneNumber}|${obj.issuedAt}|${obj.expiresAt}|${obj.nonce}`;
    const expectedSig = await hmacSha256(unsigned);

    if (expectedSig !== obj.sig) {
      return { valid: false, reason: "Invalid signature" };
    }
    if (Date.now() > obj.expiresAt) {
      return { valid: false, reason: "QR expired" };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: "Malformed QR payload" };
  }
}

(function init() {
  const student = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (student) {
    document.getElementById("registration-card").style.display = "none";
    document.getElementById("qr-card").style.display = "block";
  }
})();
