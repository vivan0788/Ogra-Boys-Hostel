import { db, collection, doc, setDoc, getDocs, updateDoc, onSnapshot, query, orderBy } from './firebase-config.js';

// Configuration: Master PIN (Keep this private)
const WARDEN_MASTER_PIN = "OGRA@1234";

let currentUser = null;

// Utility: Toast notification
export function showToast(message) {
  const toast = document.getElementById("toast");
  toast.innerText = message;
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, 3000);
}

// UI: Tab switcher
window.switchAuthTab = function(tab) {
  document.getElementById('student-login-form').classList.add('hidden');
  document.getElementById('warden-login-form').classList.add('hidden');
  document.getElementById('register-form').classList.add('hidden');

  document.querySelectorAll('[id^="tab-btn-"]').forEach(btn => {
    btn.classList.remove('bg-blue-600', 'text-white');
    btn.classList.add('text-slate-400');
  });

  const activeBtn = document.getElementById(`tab-btn-${tab}`);
  if (activeBtn) {
    activeBtn.classList.add('bg-blue-600', 'text-white');
    activeBtn.classList.remove('text-slate-400');
  }

  if (tab === 'student-login') document.getElementById('student-login-form').classList.remove('hidden');
  if (tab === 'warden-login') document.getElementById('warden-login-form').classList.remove('hidden');
  if (tab === 'register') document.getElementById('register-form').classList.remove('hidden');
};

// Event: Student Registration
document.getElementById('register-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const roll = document.getElementById('reg-roll').value.trim();
  const name = document.getElementById('reg-name').value.trim();
  const room = document.getElementById('reg-room').value.trim();
  const floor = document.getElementById('reg-floor').value;
  const phone = document.getElementById('reg-phone').value.trim();
  const pass = document.getElementById('reg-pass').value.trim();

  try {
    await setDoc(doc(db, "students", roll), {
      name, roll, room, floor, phone, pass,
      status: "pending",
      registeredAt: new Date().toISOString()
    });
    showToast("Registration submitted! Pending Warden approval.");
    e.target.reset();
    window.switchAuthTab('student-login');
  } catch (err) {
    showToast("Error during submission: " + err.message);
  }
});

// Event: Student Login
document.getElementById('student-login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const roll = document.getElementById('stud-roll').value.trim();
  const pass = document.getElementById('stud-pass').value.trim();

  try {
    const querySnapshot = await getDocs(collection(db, "students"));
    let found = null;
    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.roll === roll && data.pass === pass) found = data;
    });

    if (!found) {
      showToast("Invalid credentials.");
      return;
    }
    if (found.status === 'pending') {
      showToast("Access Denied: Account awaiting Warden approval.");
      return;
    }

    currentUser = found;
    renderStudentView();
  } catch (err) {
    showToast("Login failed: " + err.message);
  }
});

// Event: Warden Login
document.getElementById('warden-login-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = document.getElementById('warden-user').value.trim();
  const pin = document.getElementById('warden-pin').value.trim();
  const pass = document.getElementById('warden-pass').value.trim();

  if (pin !== WARDEN_MASTER_PIN) {
    showToast("Unauthorized: Invalid Authorization PIN.");
    return;
  }

  if (user === "warden" && pass === "warden123") {
    currentUser = { role: "warden" };
    renderWardenView();
  } else {
    showToast("Invalid Warden credentials.");
  }
});

// Render: Student Screen
function renderStudentView() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('student-dashboard').classList.remove('hidden');
  document.getElementById('logout-btn').classList.remove('hidden');
  document.getElementById('role-tag').innerText = "Student Portal";

  document.getElementById('stud-disp-name').innerText = currentUser.name;
  document.getElementById('stud-disp-meta').innerText = `Roll: ${currentUser.roll} • Room: ${currentUser.room} (${currentUser.floor})`;

  listenToNotices();
}

// Render: Warden Screen
function renderWardenView() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('warden-dashboard').classList.remove('hidden');
  document.getElementById('logout-btn').classList.remove('hidden');
  document.getElementById('role-tag').innerText = "Warden Administration";

  listenToApprovals();
  listenToComplaints();
}

// Real-time: Notices
function listenToNotices() {
  const container = document.getElementById('student-notices');
  onSnapshot(collection(db, "notices"), (snap) => {
    container.innerHTML = "";
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const div = document.createElement('div');
      div.className = "p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-200 text-xs";
      div.innerText = data.text;
      container.appendChild(div);
    });
  });
}

// Real-time: Warden Approvals
function listenToApprovals() {
  const container = document.getElementById('warden-approvals-list');
  onSnapshot(collection(db, "students"), (snap) => {
    container.innerHTML = "";
    snap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.status === 'pending') {
        const div = document.createElement('div');
        div.className = "p-3 bg-slate-900 border border-slate-800 rounded-lg flex justify-between items-center";
        div.innerHTML = `
          <div>
            <p class="font-bold text-xs text-white">${data.name} (${data.roll})</p>
            <p class="text-[10px] text-slate-400">Room ${data.room} • ${data.floor}</p>
          </div>
          <button onclick="approveStudent('${data.roll}')" class="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-semibold">Approve</button>
        `;
        container.appendChild(div);
      }
    });
  });
}

// Actions
window.approveStudent = async function(roll) {
  try {
    await updateDoc(doc(db, "students", roll), { status: "approved" });
    showToast(`Student ${roll} approved successfully.`);
  } catch (err) {
    showToast(err.message);
  }
};

window.postNotice = async function() {
  const text = document.getElementById('notice-input').value.trim();
  if (!text) return;
  try {
    await setDoc(doc(collection(db, "notices")), { text, createdAt: new Date().toISOString() });
    document.getElementById('notice-input').value = "";
    showToast("Announcement broadcasted.");
  } catch (err) {
    showToast(err.message);
  }
};

// Logout Handler
document.getElementById('logout-btn')?.addEventListener('click', () => {
  currentUser = null;
  location.reload();
});

// Splash Screen Removal
window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    splash.style.opacity = '0';
    setTimeout(() => { splash.style.display = 'none'; }, 500);
  }, 1000);
});
  
