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

// ---- Data Structure (matching Android) ----
class StudentData {
  constructor(name, id, section, email, gender, phoneNumber, designation, participationNature) {
    this.name = name;
    this.id = id;
    this.section = section;
    this.email = email;
    this.gender = gender;
    this.phoneNumber = phoneNumber;
    this.designation = designation;
    this.participationNature = participationNature;
  }
}

class Payload {
  constructor(id, name, section, email, gender, phoneNumber, designation, participationNature, issuedAt, expiresAt, nonce, sig) {
    this.id = id;
    this.name = name;
    this.section = section;
    this.email = email;
    this.gender = gender;
    this.phoneNumber = phoneNumber;
    this.designation = designation;
    this.participationNature = participationNature;
    this.issuedAt = issuedAt;
    this.expiresAt = expiresAt;
    this.nonce = nonce;
    this.sig = sig;
  }
}

// ---- ID Validation (matching Android format) ----
function isValidIdFormat(id) {
  // Check if ID matches xx-xxxxx format (exactly 2 digits, dash, then 5 digits)
  const regex = /^\d{2}-\d{5}$/;
  return regex.test(id);
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ---- Registration ----
function registerStudent() {
  const name = document.getElementById("name").value.trim();
  const id = document.getElementById("studentId").value.trim();
  const section = document.getElementById("section").value;
  const email = document.getElementById("email").value.trim();
  const gender = document.getElementById("gender").value;
  const phoneNumber = document.getElementById("phone").value.trim();
  const designation = document.getElementById("designation").value;
  const participationNature = document.getElementById("participation").value;

  // Validation (matching Android validation)
  if (!name) {
    alert("Name is required");
    document.getElementById("name").focus();
    return;
  }

  if (!id) {
    alert("Student ID is required");
    document.getElementById("studentId").focus();
    return;
  }

  if (!isValidIdFormat(id)) {
    alert("ID must be in format xx-xxxxx (numbers only)");
    document.getElementById("studentId").focus();
    return;
  }

  if (!isValidEmail(email)) {
    alert("Valid email is required");
    document.getElementById("email").focus();
    return;
  }

  if (!phoneNumber || phoneNumber.length < 10) {
    alert("Valid phone number is required (at least 10 digits)");
    document.getElementById("phone").focus();
    return;
  }

  if (section === "Select Section" || section === "Select Section/Organization") {
    alert("Please select your section");
    return;
  }

  if (gender === "Select Gender") {
    alert("Please select your gender");
    return;
  }

  if (designation === "Select Designation") {
    alert("Please select your designation");
    return;
  }

  if (participationNature === "Select Participation") {
    alert("Please select nature of participation");
    return;
  }

  const studentData = new StudentData(
    name, id, section, email, gender, phoneNumber, designation, participationNature
  );

  localStorage.setItem(STORAGE_KEY, JSON.stringify(studentData));
  
  // Disable fields after registration
  disableFields();
  
  document.getElementById("registration-card").style.display = "none";
  document.getElementById("qr-card").style.display = "block";
  
  console.log("Registration successful!", studentData);
}

function disableFields() {
  document.getElementById("name").disabled = true;
  document.getElementById("studentId").disabled = true;
  document.getElementById("email").disabled = true;
  document.getElementById("phone").disabled = true;
  document.getElementById("section").disabled = true;
  document.getElementById("gender").disabled = true;
  document.getElementById("designation").disabled = true;
  document.getElementById("participation").disabled = true;
  
  const registerBtn = document.querySelector('button[onclick="registerStudent()"]');
  if (registerBtn) {
    registerBtn.disabled = true;
    registerBtn.textContent = "Already Registered";
  }
}

// QR code generation
async function generateQr() {
  const studentDataJson = localStorage.getItem(STORAGE_KEY);
  if (!studentDataJson) {
    alert("Registration data not found");
    return;
  }

  const studentData = JSON.parse(studentDataJson);
  const now = Date.now();
  
  // Set expiration to midnight of next day
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const expires = tomorrow.getTime();
  
  const nonce = crypto.randomUUID();

  // Create signature string
  const unsigned = `${studentData.id}|${studentData.name}|${studentData.section}|${studentData.email}|${studentData.gender}|${studentData.phoneNumber}|${studentData.designation}|${studentData.participationNature}|${now}|${expires}|${nonce}`;
  const sig = await hmacSha256(unsigned);

  const payload = new Payload(
    studentData.id,
    studentData.name,
    studentData.section,
    studentData.email,
    studentData.gender,
    studentData.phoneNumber,
    studentData.designation,
    studentData.participationNature,
    now,
    expires,
    nonce,
    sig
  );

  const json = JSON.stringify(payload);

  // Generate QR code
  const qrEl = document.getElementById("qrcode");
  qrEl.innerHTML = "";
  
  new QRCode(qrEl, {
    text: json,
    width: 300,
    height: 300,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M
  });
  qrEl.style.display = "block";

  // Display student information
  const infoEl = document.getElementById("qr-info");
  if (infoEl) {
    infoEl.innerHTML = `
      <div style="font-size: 14px; margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 8px;">
        <strong>Student:</strong> ${studentData.name}<br>
        <strong>ID:</strong> ${studentData.id}<br>
        <strong>Section:</strong> ${studentData.section}<br>
        <strong>Expires:</strong> ${new Date(expires).toLocaleString()}<br>
        <small style="color: #666;">QR Code: ${json.length} characters</small>
      </div>
    `;
  }

  // Start countdown timer
  if (timer) clearInterval(timer);
  
  const startCountdown = () => {
    const remaining = expires - Date.now();
    if (remaining <= 0) {
      clearInterval(timer);
      document.getElementById("countdown").textContent = "⏰ QR expired (new day)";
      return;
    }
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      document.getElementById("countdown").textContent = `QR valid for: ${hours}h ${minutes}m ${seconds}s (until midnight)`;
    } else {
      document.getElementById("countdown").textContent = `QR valid for: ${minutes}m ${seconds}s (until midnight)`;
    }
  };
  
  startCountdown();
  timer = setInterval(startCountdown, 1000);
}

// QR validation function
async function validateQrPayload(jsonString) {
  try {
    const payload = JSON.parse(jsonString);
    
    // Reconstruct signature string
    const unsigned = `${payload.id}|${payload.name}|${payload.section}|${payload.email}|${payload.gender}|${payload.phoneNumber}|${payload.designation}|${payload.participationNature}|${payload.issuedAt}|${payload.expiresAt}|${payload.nonce}`;
    const expectedSig = await hmacSha256(unsigned);

    if (expectedSig !== payload.sig) {
      return { valid: false, reason: "Invalid signature" };
    }
    
    if (Date.now() > payload.expiresAt) {
      return { valid: false, reason: "QR expired" };
    }
    
    return { 
      valid: true, 
      data: {
        id: payload.id,
        name: payload.name,
        section: payload.section,
        email: payload.email,
        gender: payload.gender,
        phoneNumber: payload.phoneNumber,
        designation: payload.designation,
        participationNature: payload.participationNature,
        issuedAt: payload.issuedAt,
        expiresAt: payload.expiresAt
      }
    };
  } catch (error) {
    return { valid: false, reason: "Malformed QR payload" };
  }
}

// Auto-format student ID input
function setupIdFormatting() {
  const idInput = document.getElementById("studentId");
  if (!idInput) return;

  idInput.addEventListener('input', function(e) {
    let value = e.target.value;
    value = value.replace(/[^\d-]/g, '');
    const digitsOnly = value.replace(/-/g, '');
    
    let formatted = '';
    if (digitsOnly.length <= 2) {
      formatted = digitsOnly;
    } else if (digitsOnly.length <= 7) {
      formatted = `${digitsOnly.substring(0, 2)}-${digitsOnly.substring(2)}`;
    } else {
      formatted = `${digitsOnly.substring(0, 2)}-${digitsOnly.substring(2, 7)}`;
    }
    
    e.target.value = formatted;
  });

  idInput.setAttribute('maxlength', '8');
}

// Initialize application
(function init() {
  setupIdFormatting();
  
  // Load existing registration if available
  const studentDataJson = localStorage.getItem(STORAGE_KEY);
  if (studentDataJson) {
    try {
      const studentData = JSON.parse(studentDataJson);
      
      // Populate form fields
      const fieldMappings = {
        "name": studentData.name || '',
        "studentId": studentData.id || '',
        "section": studentData.section || 'Select Section',
        "email": studentData.email || '',
        "gender": studentData.gender || 'Select Gender',
        "phone": studentData.phoneNumber || '',
        "designation": studentData.designation || 'Select Designation',
        "participation": studentData.participationNature || 'Select Participation'
      };

      Object.entries(fieldMappings).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.value = value;
      });
      
      // Switch to QR view
      disableFields();
      document.getElementById("registration-card").style.display = "none";
      document.getElementById("qr-card").style.display = "block";
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
})();