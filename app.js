import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { 
  getAuth, 
  signInAnonymously 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// ==========================================
// 1. CENTRAL FIREBASE CLOUD CONFIG
// ==========================================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD9eIrpvN5FzKdMohptOADAONphVBXaKQc",
  authDomain: "ogra-boys-hostel-430f3.firebaseapp.com",
  projectId: "ogra-boys-hostel-430f3",
  storageBucket: "ogra-boys-hostel-430f3.firebasestorage.app",
  messagingSenderId: "764799235258",
  appId: "1:764799235258:web:c9cbc8949f3976b5383e83"
};

const KEY_SESSION_USER = 'ogra_session_user_v1';
const SECRET_WARDEN_AUTH_PIN = "OGRA@1234";

let currentUser = JSON.parse(sessionStorage.getItem(KEY_SESSION_USER)) || null;
let currentTab = 'dashboard';
let authMode = 'student_login';
let lastRegisteredStudent = null;
let selectedAttendanceDate = new Date().toISOString().split('T')[0];

let store = {
  users: [],
  attendance: [],
  outpasses: [],
  complaints: [],
  notices: [],
  mess: {
    Monday: { breakfast: 'Poha, Sprouts, Milk/Tea', lunch: 'Rajma, Steamed Rice, Roti, Salad', snacks: 'Veg Cutlet, Tea', dinner: 'Dal Tadka, Mixed Veg, Phulka, Rice' },
    Tuesday: { breakfast: 'Aloo Paratha, Curd, Tea', lunch: 'Chole, Jeera Rice, Chapati', snacks: 'Biscuits & Tea', dinner: 'Paneer Butter Masala, Roti, Dal' },
    Wednesday: { breakfast: 'Idli, Sambar, Chutney', lunch: 'Kadhi Pakoda, Rice, Chapati', snacks: 'Veg Roll & Tea', dinner: 'Seasonal Veg, Dal Fry, Roti, Rice' },
    Thursday: { breakfast: 'Veg Upma, Tea', lunch: 'Dal Makhani, Sabzi, Rice, Roti', snacks: 'Patties & Tea', dinner: 'Paneer Bhurji, Dal, Phulka' },
    Friday: { breakfast: 'Poori Bhaji, Tea', lunch: 'Veg Biryani, Raita, Papad', snacks: 'Sandwich & Coffee', dinner: 'Matar Paneer, Dal, Chapati' },
    Saturday: { breakfast: 'Methi Paratha, Curd', lunch: 'Khichdi, Papad, Roasted Kadhi', snacks: 'Bhel Puri & Tea', dinner: 'Dum Aloo, Dal Palak, Phulka' },
    Sunday: { breakfast: 'Masala Dosa, Sambar', lunch: 'Special Hostel Feast / Paneer Special', snacks: 'Cold Drink & Biscuits', dinner: 'Shahi Paneer, Roti, Gulab Jamun' }
  }
};

const EMERGENCY_CONTACTS = [
  { role: 'Chief Warden Office', name: 'Warden Desk', phone: '+91 98765 43210', icon: 'ph-shield-check' },
  { role: 'Hostel Main Gate', name: 'Security Guard', phone: '+91 98111 22334', icon: 'ph-shield' },
  { role: 'Emergency Clinic', name: 'Campus Doctor', phone: '+91 98450 99881', icon: 'ph-first-aid' },
  { role: 'Hostel Electrician', name: 'Maintenance Team', phone: '+91 98222 55667', icon: 'ph-lightning' },
  { role: 'Hostel Plumber', name: 'Sanitation Service', phone: '+91 98333 44556', icon: 'ph-wrench' }
];

let fbApp = null;
let fbDb = null;
let fbAuth = null;
let isLiveFirebase = false;

async function initCloudSync() {
  const statusEl = document.getElementById('splash-status');

  try {
    fbApp = initializeApp(FIREBASE_CONFIG);
    fbDb = getFirestore(fbApp);
    fbAuth = getAuth(fbApp);

    await signInAnonymously(fbAuth);
    isLiveFirebase = true;

    if (statusEl) {
      statusEl.innerHTML = '<span class="text-emerald-400 font-bold">Connected to Central Hostel Cloud!</span>';
    }

    setupRealtimeListeners();
  } catch (err) {
    console.error('Firebase cloud init error:', err);
    if (statusEl) {
      statusEl.innerHTML = '<span class="text-rose-400 font-bold">Cloud Connection Failed. Check Network!</span>';
    }
  }
}

function setupRealtimeListeners() {
  if (!fbDb) return;

  const syncCollections = ['users', 'attendance', 'outpasses', 'complaints', 'notices', 'mess'];

  syncCollections.forEach(colName => {
    try {
      const colRef = collection(fbDb, colName);
      onSnapshot(colRef, (snapshot) => {
        const list = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });

        if (colName === 'mess') {
          if (list.length > 0 && list[0].menu) {
            store.mess = list[0].menu;
          }
        } else {
          store[colName] = list;
        }

        if (currentUser) {
          const updatedSelf = store.users.find(u => u.id === currentUser.id);
          if (updatedSelf) {
            currentUser = updatedSelf;
            sessionStorage.setItem(KEY_SESSION_USER, JSON.stringify(updatedSelf));
          }
        }

        renderApp();
      }, (err) => {
        console.error(`Error syncing ${colName}:`, err);
      });
    } catch (e) {
      console.error(e);
    }
  });
}

async function syncSave(collectionName, documentId, data) {
  if (fbDb) {
    try {
      const docRef = doc(fbDb, collectionName, documentId);
      await setDoc(docRef, data, { merge: true });
    } catch (err) {
      console.error('Firebase save failed:', err);
      showToast('Error saving data to cloud!', 'error');
    }
  }
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastInner = document.getElementById('toast-inner');
  const toastMsg = document.getElementById('toast-msg');
  const toastIcon = document.getElementById('toast-icon');

  toastMsg.innerText = message;
  if (type === 'success') {
    toastInner.className = 'flex items-center gap-3 p-3.5 rounded-2xl shadow-xl text-white text-sm font-semibold backdrop-blur-md bg-emerald-600 shadow-emerald-500/25';
    toastIcon.className = 'ph-bold ph-check-circle text-xl';
  } else if (type === 'error') {
    toastInner.className = 'flex items-center gap-3 p-3.5 rounded-2xl shadow-xl text-white text-sm font-semibold backdrop-blur-md bg-rose-600 shadow-rose-500/25';
    toastIcon.className = 'ph-bold ph-warning-circle text-xl';
  } else {
    toastInner.className = 'flex items-center gap-3 p-3.5 rounded-2xl shadow-xl text-white text-sm font-semibold backdrop-blur-md bg-brand-600 shadow-brand-500/25';
    toastIcon.className = 'ph-bold ph-info text-xl';
  }

  toast.classList.remove('opacity-0', 'pointer-events-none', 'scale-95');
  toast.classList.add('opacity-100', 'scale-100');

  setTimeout(() => {
    toast.classList.add('opacity-0', 'pointer-events-none', 'scale-95');
    toast.classList.remove('opacity-100', 'scale-100');
  }, 3500);
}

function loginUser(user) {
  currentUser = user;
  sessionStorage.setItem(KEY_SESSION_USER, JSON.stringify(user));
  currentTab = user.role === 'warden' ? 'warden_dash' : 'student_dash';
  renderApp();
  showToast(`Welcome back, ${user.name}!`, 'success');
}

function logoutUser() {
  currentUser = null;
  sessionStorage.removeItem(KEY_SESSION_USER);
  authMode = 'student_login';
  currentTab = 'dashboard';
  renderApp();
  showToast('Logged out securely.', 'info');
}

function renderApp() {
  const main = document.getElementById('main-content');
  const nav = document.getElementById('bottom-nav');
  const headerSubtitle = document.getElementById('header-subtitle');
  const headerActions = document.getElementById('header-actions');
  const liveInd = document.getElementById('live-indicator');

  if (liveInd) {
    liveInd.className = `w-2 h-2 rounded-full ${isLiveFirebase ? 'bg-emerald-500 ring-2 ring-emerald-300' : 'bg-amber-500'}`;
    liveInd.title = isLiveFirebase ? 'Hostel Cloud Synchronized' : 'Connecting to Cloud...';
  }

  // 1. Unauthenticated Gateway (Default: Seedha Student/Warden Login dikhega)
  if (!currentUser) {
    nav.classList.add('hidden');
    headerSubtitle.innerText = 'Residence Portal Gateway';
    headerActions.innerHTML = `
      <button onclick="window.switchAuth('warden_login')" class="px-2.5 py-1.5 rounded-xl ${authMode === 'warden_login' ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} text-xs font-bold flex items-center gap-1 transition">
        <i class="ph-bold ph-shield-check"></i> Warden Portal
      </button>
    `;
    renderAuthGateway(main);
    return;
  }

  // 2. Warden Authenticated
  if (currentUser.role === 'warden') {
    nav.classList.remove('hidden');
    headerSubtitle.innerText = `Chief Warden Desk • ${currentUser.name}`;
    headerActions.innerHTML = `
      <button onclick="window.appLogout()" title="Logout" class="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition">
        <i class="ph-bold ph-sign-out text-lg"></i>
      </button>
    `;
    renderWardenNav(nav);
    renderWardenContent(main);
    return;
  }

  // 3. Student Authenticated
  if (currentUser.role === 'student') {
    nav.classList.remove('hidden');
    headerSubtitle.innerText = `Room ${currentUser.room} • ${currentUser.block}`;
    headerActions.innerHTML = `
      <button onclick="window.appLogout()" title="Logout" class="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition">
        <i class="ph-bold ph-sign-out text-lg"></i>
      </button>
    `;
    renderStudentNav(nav);
    renderStudentContent(main);
  }
}
function renderAuthGateway(container) {
  // Sirf tabhi setup screen dikhayega jab specifically warden setup par switch kiya jaye
  if (authMode === 'warden_setup') {
    container.innerHTML = `
      <div class="py-2 space-y-4">
        <div class="bg-gradient-to-br from-indigo-700 via-brand-600 to-indigo-900 rounded-3xl p-6 text-white shadow-xl">
          <span class="inline-block px-3 py-1 bg-amber-400 text-slate-900 rounded-full text-[11px] font-black uppercase tracking-wider mb-2">Initial Setup</span>
          <h2 class="text-2xl font-black">Register Chief Warden</h2>
          <p class="text-xs text-brand-100 mt-1 leading-relaxed">
            Configure the master Chief Warden account for Ogra Boys Hostel to manage student approvals, daily attendance, and hostel administration.
          </p>
        </div>

        <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <form onsubmit="window.handleWardenSetup(event)" class="space-y-3.5">
            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Chief Warden Full Name</label>
              <input type="text" id="w-setup-name" required placeholder="e.g. Dr. Robert Vance" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Contact Mobile Number</label>
              <input type="tel" id="w-setup-phone" required placeholder="e.g. 9876543210" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Admin Username</label>
              <input type="text" id="w-setup-user" required placeholder="e.g. warden" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Admin Password</label>
              <input type="password" id="w-setup-pass" required placeholder="Create secure password" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
            <div>
              <label class="block text-xs font-bold text-rose-700 uppercase mb-1 flex items-center gap-1">
                <i class="ph-bold ph-key"></i> Master Warden Secret Authorization PIN
              </label>
              <input type="password" id="w-setup-pin" required placeholder="Enter secret authorization PIN" class="w-full px-3.5 py-2.5 bg-rose-50/50 border border-rose-200 rounded-xl text-sm font-bold text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-400" />
              <p class="text-[11px] text-slate-400 mt-1">Students are strictly prohibited. Only authorized hostel authority can activate this account.</p>
            </div>

            <button type="submit" class="w-full mt-2 py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-brand-500/25 active:scale-95 transition">
              Verify Secret PIN & Create Warden Account
            </button>
            <button type="button" onclick="window.switchAuth('warden_login')" class="w-full py-2.5 text-xs text-slate-500 font-bold hover:text-slate-800 transition">
              ← Back to Warden Login
            </button>
          </form>
        </div>
      </div>
    `;
    return;
  }

  if (authMode === 'submitted_success') {
    const student = lastRegisteredStudent || { name: 'Student', rollNo: 'ID', room: '0', block: 'Floor' };
    container.innerHTML = `
      <div class="py-4 space-y-4">
        <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-lg text-center space-y-4">
          <div class="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center text-3xl mx-auto shadow-md">
            <i class="ph-bold ph-hourglass-high animate-pulse"></i>
          </div>

          <div>
            <span class="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-[11px] font-extrabold uppercase rounded-full mb-1">Status: Pending Verification</span>
            <h3 class="text-xl font-extrabold text-slate-900">Application Submitted!</h3>
            <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Your admission registration for <strong>${student.name}</strong> (Roll: ${student.rollNo}, Room ${student.room}, ${student.block}) has been sent directly to the Chief Warden.
            </p>
          </div>

          <div class="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 text-left text-xs text-amber-900 space-y-1.5">
            <div class="font-bold flex items-center gap-1.5">
              <i class="ph-bold ph-info text-base text-amber-600"></i> Strict Policy:
            </div>
            <p class="text-[11px] text-amber-800 leading-normal">
              You cannot log into your dashboard until Warden Sir clicks <strong>Approve</strong> from the Warden Admin Panel.
            </p>
          </div>

          <div class="space-y-2 pt-2">
            <button onclick="window.switchAuth('warden_login')" class="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition active:scale-95">
              <i class="ph-bold ph-shield-check text-base text-amber-400"></i> Go to Warden Login
            </button>
            <button onclick="window.switchAuth('student_login')" class="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition">
              Back to Student Login
            </button>
          </div>
        </div>
      </div>
    `;
    return;
  }

  // DEFAULT VIEW: Student Login / Warden Login / New Register (Image 2)
  container.innerHTML = `
    <div class="py-2 space-y-4">
      <div class="bg-gradient-to-br ${authMode === 'warden_login' ? 'from-slate-900 via-indigo-950 to-slate-800' : 'from-brand-600 via-indigo-600 to-indigo-800'} rounded-3xl p-5 text-white shadow-xl transition-all">
        <span class="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-bold uppercase tracking-wider mb-2">
          ${authMode === 'warden_login' ? 'Official Admin Portal' : 'Ogra Boys Hostel'}
        </span>
        <h2 class="text-xl font-black">${authMode === 'warden_login' ? 'Chief Warden Administration' : 'Digital Resident Portal'}</h2>
        <p class="text-xs text-brand-100 mt-1 leading-relaxed">
          ${authMode === 'warden_login' 
            ? 'Sign in to authorize student admissions, mark live night attendance, and manage facility grievances.' 
            : 'Student access for official gate passes, room maintenance grievances, daily meal menus, and notices.'}
        </p>
      </div>

      <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
        <div class="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl mb-4 text-xs font-bold text-slate-600">
          <button onclick="window.switchAuth('student_login')" class="py-2 rounded-xl text-center transition ${authMode === 'student_login' ? 'bg-white text-brand-600 shadow-sm' : 'hover:text-slate-900'}">
            Student Login
          </button>
          <button onclick="window.switchAuth('warden_login')" class="py-2 rounded-xl text-center transition ${authMode === 'warden_login' ? 'bg-white text-indigo-700 shadow-sm' : 'hover:text-slate-900'}">
            Warden Login
          </button>
          <button onclick="window.switchAuth('register')" class="py-2 rounded-xl text-center transition ${authMode === 'register' ? 'bg-white text-brand-600 shadow-sm' : 'hover:text-slate-900'}">
            New Register
          </button>
        </div>

        ${authMode === 'warden_login' ? `
          <form onsubmit="window.handleAuthLogin(event, 'warden')" class="space-y-3.5">
            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Warden Username / Mobile</label>
              <div class="relative">
                <i class="ph-bold ph-user-circle-gear absolute left-3.5 top-3.5 text-slate-400 text-lg"></i>
                <input type="text" id="auth-u" required placeholder="Enter warden username" class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Master Password</label>
              <div class="relative">
                <i class="ph-bold ph-lock-key absolute left-3.5 top-3.5 text-slate-400 text-lg"></i>
                <input type="password" id="auth-p" required placeholder="Enter warden password" class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
              </div>
            </div>

            <button type="submit" class="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs shadow-md active:scale-95 transition flex items-center justify-center gap-2">
              <i class="ph-bold ph-sign-in text-base text-amber-400"></i>
              Sign In as Warden
            </button>

            <div class="mt-3 text-center">
              <button type="button" onclick="window.switchAuth('warden_setup')" class="text-[11px] text-indigo-600 font-bold hover:underline">
                First Time Warden? Create Warden Account →
              </button>
            </div>
          </form>
        ` : authMode === 'student_login' ? `
          <form onsubmit="window.handleAuthLogin(event, 'student')" class="space-y-3.5">
            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Roll Number / Username</label>
              <div class="relative">
                <i class="ph-bold ph-user absolute left-3.5 top-3.5 text-slate-400 text-lg"></i>
                <input type="text" id="auth-u" required placeholder="e.g. 24BCS015" class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Password</label>
              <div class="relative">
                <i class="ph-bold ph-lock-key absolute left-3.5 top-3.5 text-slate-400 text-lg"></i>
                <input type="password" id="auth-p" required placeholder="Enter your password" class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
              </div>
            </div>

            <button type="submit" class="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-brand-500/25 active:scale-95 transition flex items-center justify-center gap-2">
              <i class="ph-bold ph-sign-in text-base"></i>
              Student Sign In
            </button>
          </form>

          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-500">New admission in hostel?</span>
            <button onclick="window.switchAuth('register')" class="text-brand-600 font-bold hover:underline">Register Here →</button>
          </div>
        ` : `
          <div class="mb-3.5 bg-indigo-50 text-indigo-900 text-xs p-3 rounded-2xl flex items-center gap-2 border border-indigo-100">
            <i class="ph-bold ph-info text-indigo-600 text-lg flex-shrink-0"></i>
            <span>Your application will be sent to the Warden for authorization before access is granted.</span>
          </div>

          <form onsubmit="window.handleStudentRegister(event)" class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Full Name</label>
              <input type="text" id="reg-name" required placeholder="e.g. Rahul Sharma" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
            </div>

            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Roll / Student ID</label>
                <input type="text" id="reg-roll" required placeholder="e.g. 24BCS042" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold uppercase" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Hostel Floor</label>
                <select id="reg-floor" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                  <option value="Ground-Floor">Ground-Floor</option>
                  <option value="1st-Floor">1st-Floor</option>
                  <option value="2nd-Floor">2nd-Floor</option>
                  <option value="3rd-Floor">3rd-Floor</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Room Number</label>
                <input type="text" id="reg-room" required placeholder="e.g. 104" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Mobile Number</label>
                <input type="tel" id="reg-phone" required placeholder="10-digit number" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Login Username</label>
              <input type="text" id="reg-username" required placeholder="e.g. rahul24" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Password</label>
              <input type="password" id="reg-pass" required placeholder="Create secure password" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
            </div>

            <button type="submit" class="w-full mt-2 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-brand-500/25 active:scale-95 transition">
              Submit Admission for Warden Approval
            </button>
          </form>
        `}
      </div>
    </div>
  `;
}

        



function renderWardenNav(nav) {
  const tabs = [
    { id: 'warden_dash', label: 'Overview', icon: 'ph-squares-four' },
    { id: 'warden_attendance', label: 'Attendance', icon: 'ph-calendar-check' },
    { id: 'warden_outpasses', label: 'Outpasses', icon: 'ph-ticket' },
    { id: 'warden_complaints', label: 'Grievances', icon: 'ph-wrench' },
    { id: 'warden_more', label: 'Admin', icon: 'ph-sliders-horizontal' }
  ];

  const pendingStudents = store.users.filter(u => u.role === 'student' && u.status === 'pending').length;
  const pendingOutpasses = store.outpasses.filter(o => o.status === 'Pending').length;

  nav.innerHTML = tabs.map(tab => {
    const isActive = currentTab === tab.id;
    let badge = 0;
    if (tab.id === 'warden_more' && pendingStudents > 0) badge = pendingStudents;
    if (tab.id === 'warden_outpasses' && pendingOutpasses > 0) badge = pendingOutpasses;

    return `
      <button onclick="window.switchTab('${tab.id}')" class="flex flex-col items-center justify-center relative py-1 px-2.5 rounded-2xl transition ${isActive ? 'text-brand-600 font-bold' : 'text-slate-400 font-medium hover:text-slate-600'}">
        <div class="relative">
          <i class="ph-bold ${tab.icon} text-2xl"></i>
          ${badge > 0 ? `<span class="absolute -top-1 -right-2 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">${badge}</span>` : ''}
        </div>
        <span class="text-[10px] mt-0.5">${tab.label}</span>
      </button>
    `;
  }).join('');
}
window.switchTab = (tabId) => {
  currentTab = tabId;
  renderApp();
};

function renderWardenContent(container) {
  if (currentTab === 'warden_dash') renderWardenOverview(container);
  else if (currentTab === 'warden_attendance') renderWardenAttendance(container);
  else if (currentTab === 'warden_outpasses') renderWardenOutpasses(container);
  else if (currentTab === 'warden_complaints') renderWardenComplaints(container);
  else if (currentTab === 'warden_more') renderWardenAdminSuite(container);
}

function renderWardenOverview(container) {
  const students = store.users.filter(u => u.role === 'student');
  const approved = students.filter(u => u.status === 'approved');
  const pending = students.filter(u => u.status === 'pending');
  const pendingOutpasses = store.outpasses.filter(o => o.status === 'Pending');
  const pendingComplaints = store.complaints.filter(c => c.status === 'pending');

  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = store.attendance.filter(a => a.date === today);
  const presentToday = todayAttendance.filter(a => a.status === 'Present').length;

  container.innerHTML = `
    <div class="space-y-4">
      <div class="bg-gradient-to-tr from-brand-600 to-indigo-700 rounded-3xl p-5 text-white shadow-md">
        <div class="flex justify-between items-start">
          <div>
            <span class="text-[11px] bg-white/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">Chief Warden Desk</span>
            <h2 class="text-xl font-extrabold mt-2">Welcome, Warden!</h2>
            <p class="text-xs text-brand-100 mt-0.5">Real-time attendance, permissions, and hostel discipline.</p>
          </div>
          <div class="p-3 bg-white/10 rounded-2xl text-2xl"><i class="ph-fill ph-shield-check"></i></div>
        </div>
      </div>

      ${(pending.length > 0 || pendingOutpasses.length > 0) ? `
        <div class="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i class="ph-fill ph-bell-ringing text-amber-600 text-lg"></i>
            <div class="text-xs text-amber-900 font-bold">
              ${pending.length} Registrations • ${pendingOutpasses.length} Outpasses Pending
            </div>
          </div>
          <button onclick="window.switchTab('warden_more')" class="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg">Review</button>
        </div>
      ` : ''}

      <div class="grid grid-cols-2 gap-3">
        <div onclick="window.switchTab('warden_attendance')" class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-brand-300 transition">
          <div class="flex items-center justify-between text-slate-400 mb-2">
            <span class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold"><i class="ph-bold ph-check text-lg"></i></span>
            <span class="text-[11px] font-bold">Today</span>
          </div>
          <div class="text-2xl font-black text-slate-900">${presentToday} / ${approved.length}</div>
          <p class="text-[11px] text-emerald-600 font-bold mt-0.5">Present Today</p>
        </div>

        <div onclick="window.switchTab('warden_outpasses')" class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-brand-300 transition">
          <div class="flex items-center justify-between text-slate-400 mb-2">
            <span class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold"><i class="ph-bold ph-ticket text-lg"></i></span>
            <span class="text-[11px] font-bold">Gate</span>
          </div>
          <div class="text-2xl font-black text-slate-900">${pendingOutpasses.length}</div>
          <p class="text-[11px] text-indigo-600 font-bold mt-0.5">Pending Passes</p>
        </div>

        <div onclick="window.switchTab('warden_complaints')" class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-brand-300 transition">
          <div class="flex items-center justify-between text-slate-400 mb-2">
            <span class="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold"><i class="ph-bold ph-wrench text-lg"></i></span>
            <span class="text-[11px] font-bold">Issues</span>
          </div>
          <div class="text-2xl font-black text-slate-900">${pendingComplaints.length}</div>
          <p class="text-[11px] text-rose-600 font-bold mt-0.5">Pending Repairs</p>
        </div>

        <div onclick="window.switchTab('warden_more')" class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-brand-300 transition">
          <div class="flex items-center justify-between text-slate-400 mb-2">
            <span class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold"><i class="ph-bold ph-user-plus text-lg"></i></span>
            <span class="text-[11px] font-bold">Review</span>
          </div>
          <div class="text-2xl font-black text-slate-900">${pending.length}</div>
          <p class="text-[11px] text-amber-600 font-bold mt-0.5">Pending Approvals</p>
        </div>
      </div>

      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
        <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Fast Dispatch</h3>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <button onclick="window.switchTab('warden_attendance')" class="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 rounded-xl font-bold text-slate-700 flex items-center gap-2 border border-slate-200">
            <i class="ph-bold ph-clipboard-text text-brand-600 text-base"></i> Night Roll Call
          </button>
          <button onclick="window.openNoticeModal()" class="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 rounded-xl font-bold text-slate-700 flex items-center gap-2 border border-slate-200">
            <i class="ph-bold ph-megaphone text-indigo-600 text-base"></i> Post Notice
          </button>
        </div>
      </div>

      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Notices</h3>
          <button onclick="window.openNoticeModal()" class="text-xs font-bold text-brand-600">+ Create</button>
        </div>
        <div class="space-y-2">
          ${store.notices.slice(0, 2).map(n => `
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div class="flex justify-between items-center font-bold text-slate-800">
                <span>${n.title}</span>
                <span class="text-[10px] text-slate-400 font-normal">${n.date}</span>
              </div>
              <p class="text-slate-500 mt-1 line-clamp-1">${n.description}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderWardenAttendance(container) {
  const students = store.users.filter(u => u.role === 'student' && u.status === 'approved');
  const currentRecords = store.attendance.filter(a => a.date === selectedAttendanceDate);

  const statusMap = {};
  currentRecords.forEach(r => { statusMap[r.studentId] = r.status; });

  const presentCount = Object.values(statusMap).filter(s => s === 'Present').length;
  const absentCount = Object.values(statusMap).filter(s => s === 'Absent').length;
  const leaveCount = Object.values(statusMap).filter(s => s === 'On Leave').length;

  container.innerHTML = `
    <div class="space-y-4">
      <div>
        <h2 class="text-lg font-extrabold text-slate-900">Night Attendance Register</h2>
        <p class="text-xs text-slate-400">Syncs immediately to students' devices in real time</p>
      </div>

      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div class="flex items-center justify-between gap-3">
          <label class="text-xs font-bold text-slate-600 uppercase">Roll Call Date:</label>
          <input type="date" value="${selectedAttendanceDate}" onchange="window.setAttendanceDate(this.value)" class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none" />
        </div>

        <div class="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-100">
          <div class="p-2 bg-emerald-50 rounded-xl text-emerald-800 font-bold">Present: ${presentCount}</div>
          <div class="p-2 bg-rose-50 rounded-xl text-rose-800 font-bold">Absent: ${absentCount}</div>
          <div class="p-2 bg-amber-50 rounded-xl text-amber-800 font-bold">Leave: ${leaveCount}</div>
        </div>

        <button onclick="window.markAllStudentsAttendance('Present')" class="w-full py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-xl text-xs font-bold border border-brand-200 transition flex items-center justify-center gap-1.5">
          <i class="ph-bold ph-check-double text-base"></i> Mark All as Present
        </button>
      </div>

      <div class="space-y-2.5">
        <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Approved Residents (${students.length})</h3>
        ${students.length === 0 ? `
          <div class="p-6 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-400">No approved students found. Approve registrations first.</div>
        ` : students.map(s => {
          const currentStatus = statusMap[s.id] || 'Not Marked';
          return `
            <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <div class="font-bold text-slate-900 text-sm">${s.name}</div>
                <div class="text-[11px] text-slate-500 font-medium enlargement-target">Room ${s.room} • ${s.block} (${s.rollNo})</div>
              </div>

              <div class="flex items-center gap-1">
                <button onclick="window.setAttendance('${s.id}', 'Present')" title="Present" class="px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${currentStatus === 'Present' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">P</button>
                <button onclick="window.setAttendance('${s.id}', 'Absent')" title="Absent" class="px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${currentStatus === 'Absent' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">A</button>
                <button onclick="window.setAttendance('${s.id}', 'On Leave')" title="On Leave" class="px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${currentStatus === 'On Leave' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">L</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

window.setAttendanceDate = (dt) => {
  selectedAttendanceDate = dt;
  renderApp();
};

window.setAttendance = async (studentId, status) => {
  const docId = `att_${selectedAttendanceDate}_${studentId}`;
  const rec = {
    id: docId,
    studentId,
    date: selectedAttendanceDate,
    status,
    updatedAt: new Date().toISOString()
  };
  await syncSave('attendance', docId, rec);
  showToast(`Attendance marked as ${status}!`, 'success');
};

window.markAllStudentsAttendance = async (status) => {
  const students = store.users.filter(u => u.role === 'student' && u.status === 'approved');
  for (const s of students) {
    const docId = `att_${selectedAttendanceDate}_${s.id}`;
    await syncSave('attendance', docId, {
      id: docId,
      studentId: s.id,
      date: selectedAttendanceDate,
      status,
      updatedAt: new Date().toISOString()
    });
  }
  showToast(`Marked all ${students.length} students as ${status}!`, 'success');
};

function renderWardenOutpasses(container) {
  const outpasses = store.outpasses;

  container.innerHTML = `
    <div class="space-y-4">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-lg font-extrabold text-slate-900">Student Gate Pass Requests</h2>
          <p class="text-xs text-slate-400">Campus departures and overnight leaves</p>
        </div>
        <span class="px-3 py-1 bg-brand-50 text-brand-700 text-xs font-bold rounded-full">${outpasses.length} Total</span>
      </div>

      ${outpasses.length === 0 ? `
        <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400">No gate passes recorded.</div>
      ` : `
        <div class="space-y-3">
          ${outpasses.map(op => `
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
              <div class="flex justify-between items-start">
                <div>
                  <div class="font-bold text-slate-900 text-base">${op.studentName}</div>
                  <div class="text-xs text-slate-500 font-medium">Room: <strong>${op.room}</strong> (${op.block || 'Hostel'}) • Roll: <strong>${op.rollNo}</strong></div>
                </div>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                  op.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                  op.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                  op.status === 'Completed' ? 'bg-slate-100 text-slate-700' : 'bg-rose-100 text-rose-700'
                }">${op.status}</span>
              </div>

              <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                <div><strong class="text-slate-700">Type:</strong> ${op.type}</div>
                <div><strong class="text-slate-700">Departure:</strong> ${op.leaveTime.replace('T', ' ')}</div>
                <div><strong class="text-slate-700">Return:</strong> ${op.returnTime.replace('T', ' ')}</div>
                <div><strong class="text-slate-700">Reason:</strong> "${op.reason}"</div>
                <div><strong class="text-slate-700">Parent Emergency Contact:</strong> 📞 ${op.parentPhone}</div>
              </div>

              ${op.status === 'Pending' ? `
                <div class="flex gap-2 pt-1">
                  <button onclick="window.updatePassStatus('${op.id}', 'Approved')" class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                    <i class="ph-bold ph-check"></i> Authorize Pass
                  </button>
                  <button onclick="window.updatePassStatus('${op.id}', 'Rejected')" class="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                    <i class="ph-bold ph-x"></i> Reject
                  </button>
                </div>
              ` : op.status === 'Approved' ? `
                <button onclick="window.updatePassStatus('${op.id}', 'Completed')" class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold">
                  Confirm Student Return to Campus
                </button>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

window.updatePassStatus = async (outpassId, newStatus) => {
  const op = store.outpasses.find(o => o.id === outpassId);
  if (op) {
    await syncSave('outpasses', outpassId, { ...op, status: newStatus });
    showToast(`Pass status updated to: ${newStatus}`, 'success');
  }
};

function renderWardenComplaints(container) {
  const complaints = store.complaints;

  container.innerHTML = `
    <div class="space-y-4">
      <div>
        <h2 class="text-lg font-extrabold text-slate-900">Hostel Grievances & Maintenance</h2>
        <p class="text-xs text-slate-400">Track and assign repairs in real time</p>
      </div>

      ${complaints.length === 0 ? `
        <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400">No resident grievances reported.</div>
      ` : `
        <div class="space-y-3.5">
          ${complaints.map(c => `
            <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5">
              <div class="flex justify-between items-start">
                <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                  c.priority === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                }">${c.category} • ${c.priority} Priority</span>

                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  c.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                  c.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                }">${c.status.replace('_', ' ')}</span>
              </div>

              <h3 class="font-bold text-slate-900 text-sm">${c.title}</h3>
              <p class="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">${c.description}</p>
              
              <div class="text-[11px] text-slate-400 flex justify-between">
                <span>By: <strong>${c.studentName}</strong> (Room ${c.room}, ${c.block})</span>
                <span>${c.date}</span>
              </div>

              ${c.remarks ? `
                <div class="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900">
                  <strong>Warden Note:</strong> ${c.remarks}
                </div>
              ` : ''}

              <div class="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <div class="flex gap-2">
                  <button onclick="window.setComplaintState('${c.id}', 'pending')" class="flex-1 py-1 rounded-lg text-xs font-bold border ${c.status === 'pending' ? 'bg-rose-600 text-white' : 'bg-slate-50 text-slate-600'}">Pending</button>
                  <button onclick="window.setComplaintState('${c.id}', 'in_progress')" class="flex-1 py-1 rounded-lg text-xs font-bold border ${c.status === 'in_progress' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600'}">In Progress</button>
                  <button onclick="window.setComplaintState('${c.id}', 'resolved')" class="flex-1 py-1 rounded-lg text-xs font-bold border ${c.status === 'resolved' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-600'}">Resolved</button>
                </div>
                <div class="flex gap-2">
                  <input type="text" id="warden-rmk-${c.id}" value="${c.remarks || ''}" placeholder="Write maintenance note or repair update..." class="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                  <button onclick="window.saveRemark('${c.id}')" class="px-3 py-1.5 bg-brand-600 text-white text-xs font-bold rounded-xl">Save</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
  }
    window.setComplaintState = async (id, st) => {
  const c = store.complaints.find(item => item.id === id);
  if (c) {
    await syncSave('complaints', id, { ...c, status: st });
    showToast(`Complaint status set to: ${st}`, 'success');
  }
};

window.saveRemark = async (id) => {
  const input = document.getElementById(`warden-rmk-${id}`);
  if (!input) return;
  const c = store.complaints.find(item => item.id === id);
  if (c) {
    await syncSave('complaints', id, { ...c, remarks: input.value.trim() });
    showToast('Warden note updated for student!', 'success');
  }
};

// ==========================================
// 4. WARDEN ADMIN SUITE (With Student Directory)
// ==========================================
function renderWardenAdminSuite(container) {
  const students = store.users.filter(u => u.role === 'student');
  const pendingStudents = students.filter(s => s.status === 'pending');

  container.innerHTML = `
    <div class="space-y-4">
      <div>
        <h2 class="text-lg font-extrabold text-slate-900">Admin Control Center</h2>
        <p class="text-xs text-slate-400">Student admissions, notices & mess menu settings</p>
      </div>

      <!-- Pending Student Approvals -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div class="flex justify-between items-center">
          <h3 class="text-xs font-bold text-slate-600 uppercase">Student Admission Requests</h3>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">${pendingStudents.length} Pending</span>
        </div>

        ${pendingStudents.length === 0 ? `
          <p class="text-xs text-slate-400 py-2">No pending student admission requests.</p>
        ` : pendingStudents.map(s => `
          <div class="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
            <div class="flex justify-between items-start">
              <div>
                <div class="font-bold text-slate-900 text-sm">${s.name}</div>
                <div class="text-xs text-slate-600">Roll: <strong>${s.rollNo}</strong> • Room: <strong>${s.room}</strong> (${s.block})</div>
                <div class="text-[11px] text-slate-500">Phone: ${s.phone} | User: @${s.username}</div>
              </div>
            </div>
            <div class="flex gap-2 pt-1">
              <button onclick="window.approveStudentStatus('${s.id}', 'approved')" class="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                <i class="ph-bold ph-check"></i> Approve
              </button>
              <button onclick="window.approveStudentStatus('${s.id}', 'rejected')" class="flex-1 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold">
                Decline
              </button>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Resident Students Directory (Contact & Info) -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Hostel Resident Directory</h3>
            <p class="text-[11px] text-slate-400">Approved students contact & room records</p>
          </div>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-brand-700">
            ${students.filter(s => s.status === 'approved').length} Active Residents
          </span>
        </div>

        <input type="text" id="dir-search-input" oninput="window.filterResidentDirectory(this.value)" placeholder="Search by name, roll no, or room..." class="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20" />

        <div id="directory-list-container" class="space-y-2 max-h-72 overflow-y-auto pr-1">
          ${window.getResidentDirectoryHTML(students.filter(s => s.status === 'approved'))}
        </div>
      </div>

      <!-- Mess Menu Editor -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h4 class="font-bold text-slate-900 text-sm">Hostel Mess Menu</h4>
          <p class="text-xs text-slate-400">View or update weekly meals schedule</p>
        </div>
        <button onclick="window.openMessMenuModal()" class="px-3.5 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-xl text-xs font-bold border border-brand-200">
          Edit Menu
        </button>
      </div>

      <!-- Emergency Helpline Preview -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
        <h3 class="text-xs font-bold text-slate-600 uppercase">Emergency Helpline</h3>
        <div class="space-y-1.5">
          ${EMERGENCY_CONTACTS.map(c => `
            <div class="flex justify-between items-center text-xs p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span class="font-bold text-slate-800">${c.role} (${c.name})</span>
              <a href="tel:${c.phone}" class="text-brand-600 font-bold">${c.phone}</a>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

window.approveStudentStatus = async (id, st) => {
  const student = store.users.find(u => u.id === id);
  if (student) {
    await syncSave('users', id, { ...student, status: st });
    showToast(`Student admission has been ${st}!`, 'success');
  }
};

window.getResidentDirectoryHTML = (approvedStudents) => {
  if (!approvedStudents || approvedStudents.length === 0) {
    return `<div class="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">No active residents registered yet.</div>`;
  }

  return approvedStudents.map(s => `
    <div class="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 text-xs">
      <div>
        <div class="font-extrabold text-slate-900">${s.name}</div>
        <div class="text-[11px] text-slate-500 font-medium enlargement-target">
          Roll: <strong class="text-slate-700">${s.rollNo}</strong> • Room: <strong class="text-slate-700">${s.room}</strong> (${s.block})
        </div>
        <div class="text-[10px] text-slate-400 mt-0.5">
          User: @${s.username} • Joined: ${new Date(s.createdAt).toLocaleDateString()}
        </div>
      </div>

      <div class="flex items-center gap-1.5 flex-shrink-0">
        <a href="tel:${s.phone}" title="Call Resident" class="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold flex items-center gap-1 hover:bg-emerald-100 transition">
          <i class="ph-bold ph-phone-call text-sm"></i>
          <span class="hidden sm:inline text-[11px]">${s.phone}</span>
        </a>
      </div>
    </div>
  `).join('');
};

window.filterResidentDirectory = (query) => {
  const q = query.trim().toLowerCase();
  const approved = store.users.filter(u => u.role === 'student' && u.status === 'approved');
  const filtered = approved.filter(s => 
    s.name.toLowerCase().includes(q) || 
    (s.rollNo && s.rollNo.toLowerCase().includes(q)) || 
    (s.room && s.room.toString().includes(q)) ||
    (s.phone && s.phone.includes(q))
  );

  const container = document.getElementById('directory-list-container');
  if (container) {
    container.innerHTML = window.getResidentDirectoryHTML(filtered);
  }
};

// ==========================================
// 5. STUDENT PORTAL LOGIC
// ==========================================
function renderStudentNav(nav) {
  const tabs = [
    { id: 'student_dash', label: 'Home', icon: 'ph-house' },
    { id: 'student_attendance', label: 'Attendance', icon: 'ph-calendar-check' },
    { id: 'student_outpass', label: 'Outpass', icon: 'ph-ticket' },
    { id: 'student_complaints', label: 'Grievance', icon: 'ph-wrench' },
    { id: 'student_mess', label: 'Mess & Info', icon: 'ph-fork-knife' }
  ];

  nav.innerHTML = tabs.map(tab => {
    const isActive = currentTab === tab.id;
    return `
      <button onclick="window.switchTab('${tab.id}')" class="flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition ${isActive ? 'text-brand-600 font-bold' : 'text-slate-400 font-medium hover:text-slate-600'}">
        <i class="ph-bold ${tab.icon} text-2xl"></i>
        <span class="text-[10px] mt-0.5">${tab.label}</span>
      </button>
    `;
  }).join('');
}

function renderStudentContent(container) {
  if (currentTab === 'student_dash') renderStudentHome(container);
  else if (currentTab === 'student_attendance') renderStudentAttendance(container);
  else if (currentTab === 'student_outpass') renderStudentOutpass(container);
  else if (currentTab === 'student_complaints') renderStudentComplaints(container);
  else if (currentTab === 'student_mess') renderStudentMess(container);
}

function renderStudentHome(container) {
  const myComplaints = store.complaints.filter(c => c.studentId === currentUser.id);
  const myOutpasses = store.outpasses.filter(o => o.studentId === currentUser.id);
  const myAttendance = store.attendance.filter(a => a.studentId === currentUser.id);

  const totalDays = myAttendance.length;
  const presentDays = myAttendance.filter(a => a.status === 'Present').length;
  const attRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

  container.innerHTML = `
    <div class="space-y-4">
      <div class="bg-gradient-to-tr from-brand-600 to-indigo-700 rounded-3xl p-5 text-white shadow-md">
        <div class="flex justify-between items-start">
          <div>
            <span class="text-[11px] bg-white/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">Ogra Boys Hostel</span>
            <h2 class="text-xl font-extrabold mt-2">Welcome, ${currentUser.name}!</h2>
            <p class="text-xs text-brand-100">Room <strong>${currentUser.room}</strong> • <strong>${currentUser.block}</strong> (Roll: ${currentUser.rollNo})</p>
          </div>
          <div class="p-3 bg-white/10 rounded-2xl text-2xl"><i class="ph-fill ph-student"></i></div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2.5 text-center">
        <div onclick="window.switchTab('student_attendance')" class="bg-white p-3 rounded-2xl border border-slate-200 cursor-pointer shadow-sm">
          <div class="text-lg font-black text-emerald-600">${attRate}%</div>
          <div class="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Attendance</div>
        </div>
        <div onclick="window.switchTab('student_outpass')" class="bg-white p-3 rounded-2xl border border-slate-200 cursor-pointer shadow-sm">
          <div class="text-lg font-black text-indigo-600">${myOutpasses.length}</div>
          <div class="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Outpasses</div>
        </div>
        <div onclick="window.switchTab('student_complaints')" class="bg-white p-3 rounded-2xl border border-slate-200 cursor-pointer shadow-sm">
          <div class="text-lg font-black text-rose-600">${myComplaints.length}</div>
          <div class="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Complaints</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button onclick="window.switchTab('student_complaints')" class="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 text-left">
          <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl font-bold"><i class="ph-bold ph-wrench"></i></div>
          <div>
            <div class="font-bold text-slate-900 text-xs">File Complaint</div>
            <div class="text-[10px] text-slate-400">Electricity, tap, wifi</div>
          </div>
        </button>
        <button onclick="window.switchTab('student_outpass')" class="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 text-left">
          <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold"><i class="ph-bold ph-ticket"></i></div>
          <div>
            <div class="font-bold text-slate-900 text-xs">Apply Gate Pass</div>
            <div class="text-[10px] text-slate-400">Market / Night leave</div>
          </div>
        </button>
      </div>

      <div class="space-y-3">
        <div class="flex justify-between items-center">
          <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Hostel Announcements</h3>
          <span class="text-xs font-bold text-brand-600">${store.notices.length} Active</span>
        </div>
        ${store.notices.length === 0 ? `
          <div class="p-6 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-400">No active announcements.</div>
        ` : store.notices.map(n => `
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
            <div class="flex justify-between items-center text-xs">
              <span class="px-2 py-0.5 rounded-md font-bold text-[10px] ${
                n.category === 'Urgent' ? 'bg-rose-100 text-rose-700' :
                n.category === 'Maintenance' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
              }">${n.category}</span>
              <span class="text-[10px] text-slate-400">${n.date}</span>
            </div>
            <h4 class="font-bold text-slate-900 text-sm">${n.title}</h4>
            <p class="text-xs text-slate-600 leading-relaxed">${n.description}</p>
            <div class="text-[10px] text-slate-400 pt-1 border-t border-slate-100">Issued by: <strong>${n.author}</strong></div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderStudentAttendance(container) {
  const records = store.attendance.filter(a => a.studentId === currentUser.id);
  const total = records.length;
  const present = records.filter(a => a.status === 'Present').length;
  const absent = records.filter(a => a.status === 'Absent').length;
  const leave = records.filter(a => a.status === 'On Leave').length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 100;

  container.innerHTML = `
    <div class="space-y-4">
      <div>
        <h2 class="text-lg font-extrabold text-slate-900">Attendance History</h2>
        <p class="text-xs text-slate-400">Night roll calls verified by Chief Warden</p>
      </div>

      <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Cumulative Attendance</span>
          <div class="text-3xl font-black ${rate >= 75 ? 'text-emerald-600' : 'text-rose-600'} mt-1">${rate}%</div>
          <p class="text-xs text-slate-500 mt-1">${rate >= 75 ? 'Attendance criterion fulfilled' : 'Warning: Below minimum requirement'}</p>
        </div>
        <div class="text-right space-y-1 text-xs font-semibold">
          <div class="text-emerald-600">Present: <strong>${present}</strong></div>
          <div class="text-rose-600">Absent: <strong>${absent}</strong></div>
          <div class="text-amber-600">Leave: <strong>${leave}</strong></div>
        </div>
      </div>

      <div class="space-y-2">
        <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Attendance Logs (${total} Days)</h3>
        ${total === 0 ? `
          <div class="p-6 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-400">No attendance marked yet.</div>
        ` : records.map(r => `
          <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center text-xs">
            <div>
              <span class="font-bold text-slate-800">${r.date}</span>
              <span class="text-slate-400 block text-[10px]">Warden Roll Call</span>
            </div>
            <span class="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${
              r.status === 'Present' ? 'bg-emerald-100 text-emerald-700' :
              r.status === 'Absent' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
            }">${r.status}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderStudentOutpass(container) {
  const myOutpasses = store.outpasses.filter(o => o.studentId === currentUser.id);

  container.innerHTML = `
    <div class="space-y-4">
      <div>
        <h2 class="text-lg font-extrabold text-slate-900">Hostel Gate Pass Application</h2>
        <p class="text-xs text-slate-400">Authorized digital gate pass for security verification</p>
      </div>

      <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <i class="ph-bold ph-plus-circle text-brand-600 text-base"></i> Apply for Gate Pass
        </h3>

        <form onsubmit="window.handleStudentOutpassSubmit(event)" class="space-y-3">
          <div>
            <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Pass Category</label>
            <select id="op-type" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold">
              <option value="Day Pass (Market/Library)">Day Pass (Market / Library / Academic)</option>
              <option value="Home Outpass (Weekend/Holiday)">Home Outpass (Weekend / Holiday Leave)</option>
              <option value="Emergency Outpass">Emergency / Medical Hospital Visit</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Departure</label>
              <input type="datetime-local" id="op-leave" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Return Time</label>
              <input type="datetime-local" id="op-return" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Reason / Destination</label>
            <input type="text" id="op-reason" required placeholder="e.g. Attending library or coaching" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Parent's Emergency Phone</label>
            <input type="tel" id="op-parent-phone" required placeholder="Parent mobile number" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
          </div>

          <button type="submit" class="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/25 active:scale-95 transition">
            Submit Gate Pass to Warden
          </button>
        </form>
      </div>

       <div class="space-y-3">
        <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Gate Pass History</h3>
        ${myOutpasses.length === 0 ? `
          <div class="p-6 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-400">No gate passes submitted yet.</div>
        ` : myOutpasses.map(op => `
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div class="flex justify-between items-start">
              <div>
                <span class="font-bold text-slate-900 text-sm">${op.type}</span>
                <div class="text-[10px] text-slate-400">Pass Code: <strong>${op.passCode}</strong></div>
              </div>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                op.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                op.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                op.status === 'Completed' ? 'bg-slate-100 text-slate-700' : 'bg-rose-100 text-rose-700'
              }">${op.status}</span>
            </div>

            <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
              <div><strong class="text-slate-700">Departure:</strong> ${op.leaveTime.replace('T', ' ')}</div>
              <div><strong class="text-slate-700">Return:</strong> ${op.returnTime.replace('T', ' ')}</div>
              <div><strong class="text-slate-700">Reason:</strong> "${op.reason}"</div>
            </div>

            ${op.status === 'Approved' ? `
              <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <div class="text-xs font-black text-emerald-800 tracking-wider">OFFICIAL GATE PASS VERIFIED</div>
                <div class="text-xs font-mono font-bold text-emerald-700 mt-0.5">${op.passCode}</div>
                <div class="text-[10px] text-emerald-600 mt-1">Show this card to the security guard at the gate</div>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

window.handleStudentOutpassSubmit = async (e) => {
  e.preventDefault();
  const type = document.getElementById('op-type').value;
  const leaveTime = document.getElementById('op-leave').value;
  const returnTime = document.getElementById('op-return').value;
  const reason = document.getElementById('op-reason').value.trim();
  const parentPhone = document.getElementById('op-parent-phone').value.trim();

  const docId = 'op_' + Date.now();
  const newPass = {
    id: docId,
    studentId: currentUser.id,
    studentName: currentUser.name,
    rollNo: currentUser.rollNo,
    room: currentUser.room,
    block: currentUser.block,
    type,
    leaveTime,
    returnTime,
    reason,
    parentPhone,
    status: 'Pending',
    passCode: 'OGRA-' + Math.floor(10000 + Math.random() * 90000),
    createdAt: new Date().toISOString()
  };

  await syncSave('outpasses', docId, newPass);
  showToast('Gate pass submitted! Warden approval required.', 'success');
};

function renderStudentComplaints(container) {
  const myComplaints = store.complaints.filter(c => c.studentId === currentUser.id);

  container.innerHTML = `
    <div class="space-y-4">
      <div>
        <h2 class="text-lg font-extrabold text-slate-900">Hostel Complaints & Repairs</h2>
        <p class="text-xs text-slate-400">Directly addressed by Warden and maintenance team</p>
      </div>

      <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <i class="ph-bold ph-pencil-line text-brand-600 text-base"></i> File New Grievance
        </h3>

        <form onsubmit="window.handleStudentComplaintSubmit(event)" class="space-y-3">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Issue Category</label>
              <select id="sc-cat" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                <option value="Electrical">⚡ Electrical (Fan, Light, Switch)</option>
                <option value="Plumbing">🚰 Plumbing (Tap, Leakage, Flush)</option>
                <option value="Internet / WiFi">📶 WiFi & Network</option>
                <option value="Carpentry">🚪 Carpentry (Door, Bed, Almirah)</option>
                <option value="Housekeeping">🧹 Room Sanitation</option>
                <option value="Mess & Dining">🍛 Food & Mess Service</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Priority</label>
              <select id="sc-prio" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                <option value="Medium">Medium Priority</option>
                <option value="High">High (Urgent)</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Subject / Issue Title</label>
            <input type="text" id="sc-title" required placeholder="e.g. Switchboard sparking or leaking tap" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Detailed Description</label>
            <textarea id="sc-desc" required rows="2" placeholder="Specify room area and details..." class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"></textarea>
          </div>

          <button type="submit" class="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/25 active:scale-95 transition">
            Submit Complaint to Chief Warden
          </button>
        </form>
      </div>

      <div class="space-y-3">
        <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">My Registered Complaints (${myComplaints.length})</h3>
        ${myComplaints.length === 0 ? `
          <div class="p-6 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-400">No complaints filed yet.</div>
        ` : myComplaints.map(c => `
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div class="flex justify-between items-start">
              <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">${c.category} • ${c.priority}</span>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                c.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                c.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
              }">${c.status.replace('_', ' ')}</span>
            </div>
            <h4 class="font-bold text-slate-900 text-sm">${c.title}</h4>
            <p class="text-xs text-slate-600">${c.description}</p>
            ${c.remarks ? `
              <div class="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900">
                <strong>Warden Remark:</strong> ${c.remarks}
              </div>
            ` : ''}
            <div class="text-[10px] text-slate-400 pt-1 border-t border-slate-100">Reported on: ${c.date}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

window.handleStudentComplaintSubmit = async (e) => {
  e.preventDefault();
  const category = document.getElementById('sc-cat').value;
  const priority = document.getElementById('sc-prio').value;
  const title = document.getElementById('sc-title').value.trim();
  const description = document.getElementById('sc-desc').value.trim();

  const docId = 'comp_' + Date.now();
  const newComp = {
    id: docId,
    studentId: currentUser.id,
    studentName: currentUser.name,
    room: currentUser.room,
    block: currentUser.block,
    category,
    priority,
    title,
    description,
    status: 'pending',
    remarks: '',
    date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: new Date().toISOString()
  };

  await syncSave('complaints', docId, newComp);
  showToast('Grievance logged with Chief Warden!', 'success');
};

function renderStudentMess(container) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayDay = days[(new Date().getDay() + 6) % 7];
  const messMenu = store.mess;

  container.innerHTML = `
    <div class="space-y-4">
      <div>
        <h2 class="text-lg font-extrabold text-slate-900">Mess Menu & Helplines</h2>
        <p class="text-xs text-slate-400">Weekly meal schedule and emergency contacts</p>
      </div>

      <div class="bg-gradient-to-tr from-amber-500 to-orange-500 rounded-3xl p-5 text-white shadow-md space-y-2">
        <span class="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">Today: ${todayDay}</span>
        <h3 class="text-base font-extrabold">Today's Hostel Meals</h3>
        <div class="text-xs text-amber-50 space-y-1 pt-1 border-t border-white/20">
          <div><strong>Breakfast:</strong> ${messMenu[todayDay]?.breakfast || 'Healthy Breakfast & Tea'}</div>
          <div><strong>Lunch:</strong> ${messMenu[todayDay]?.lunch || 'Full Hostel Thali'}</div>
          <div><strong>Evening Snacks:</strong> ${messMenu[todayDay]?.snacks || 'Tea & Snacks'}</div>
          <div><strong>Dinner:</strong> ${messMenu[todayDay]?.dinner || 'Special Sabzi, Dal, Roti, Rice'}</div>
        </div>
      </div>

      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
        <h3 class="text-xs font-bold text-slate-600 uppercase tracking-wider">Weekly Mess Schedule</h3>
        <div class="space-y-2 text-xs">
          ${days.map(d => `
            <details class="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <summary class="font-bold text-slate-800 cursor-pointer flex justify-between items-center">
                <span>${d}</span>
                <span class="text-[10px] text-brand-600">View Menu</span>
              </summary>
              <div class="pt-2 mt-2 border-t border-slate-200 text-slate-600 space-y-1">
                <div><strong>🍳 Breakfast:</strong> ${messMenu[d]?.breakfast}</div>
                <div><strong>🍛 Lunch:</strong> ${messMenu[d]?.lunch}</div>
                <div><strong>☕ Snacks:</strong> ${messMenu[d]?.snacks}</div>
                <div><strong>🍽️ Dinner:</strong> ${messMenu[d]?.dinner}</div>
              </div>
            </details>
          `).join('')}
        </div>
      </div>

      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
        <h3 class="text-xs font-bold text-slate-600 uppercase tracking-wider">Emergency Helplines</h3>
        <div class="space-y-1.5">
          ${EMERGENCY_CONTACTS.map(c => `
            <div class="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div>
                <span class="font-bold text-slate-800 block">${c.role}</span>
                <span class="text-slate-400 text-[10px]">${c.name}</span>
              </div>
              <a href="tel:${c.phone}" class="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold flex items-center gap-1">
                <i class="ph-bold ph-phone-call"></i> Call
              </a>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}       
window.openNoticeModal = () => {
  const modal = document.createElement('div');
  modal.id = 'notice-modal';
  modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-3">
      <div class="flex justify-between items-center">
        <h3 class="font-extrabold text-slate-900 text-base">Broadcast Live Notice</h3>
        <button onclick="document.getElementById('notice-modal').remove()" class="text-slate-400 hover:text-slate-600"><i class="ph-bold ph-x text-lg"></i></button>
      </div>
      <form onsubmit="window.handleNoticeSubmit(event)" class="space-y-3">
        <div>
          <label class="block text-xs font-bold text-slate-600 mb-1">Notice Headline</label>
          <input type="text" id="nm-title" required placeholder="e.g. Mandatory Roll Call at 9:30 PM" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-600 mb-1">Category</label>
          <select id="nm-cat" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
            <option value="Urgent">🚨 Urgent</option>
            <option value="General">📢 General</option>
            <option value="Maintenance">🔧 Maintenance</option>
            <option value="Mess">🍛 Food & Mess</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-600 mb-1">Details</label>
          <textarea id="nm-desc" required rows="3" placeholder="Notice details..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"></textarea>
        </div>
        <button type="submit" class="w-full py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold">Broadcast to All Students</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
};

window.handleNoticeSubmit = async (e) => {
  e.preventDefault();
  const title = document.getElementById('nm-title').value.trim();
  const category = document.getElementById('nm-cat').value;
  const description = document.getElementById('nm-desc').value.trim();

  const docId = 'not_' + Date.now();
  const newNotice = {
    id: docId,
    title,
    category,
    description,
    author: currentUser ? currentUser.name : 'Chief Warden Desk',
    date: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: new Date().toISOString()
  };

  await syncSave('notices', docId, newNotice);
  document.getElementById('notice-modal').remove();
  showToast('Notice broadcasted to all students!', 'success');
};

window.openMessMenuModal = () => {
  const modal = document.createElement('div');
  modal.id = 'mess-modal';
  modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-3">
      <div class="flex justify-between items-center">
        <h3 class="font-extrabold text-slate-900 text-base">Edit Sunday Special Menu</h3>
        <button onclick="document.getElementById('mess-modal').remove()" class="text-slate-400 hover:text-slate-600"><i class="ph-bold ph-x text-lg"></i></button>
      </div>
      <form onsubmit="window.handleMessSave(event)" class="space-y-3">
        <div>
          <label class="block text-xs font-bold text-slate-600 mb-1">Sunday Breakfast</label>
          <input type="text" id="mm-bf" value="${store.mess['Sunday']?.breakfast || ''}" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-600 mb-1">Sunday Lunch</label>
          <input type="text" id="mm-lunch" value="${store.mess['Sunday']?.lunch || ''}" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-600 mb-1">Sunday Snacks</label>
          <input type="text" id="mm-snacks" value="${store.mess['Sunday']?.snacks || ''}" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-600 mb-1">Sunday Dinner</label>
          <input type="text" id="mm-dinner" value="${store.mess['Sunday']?.dinner || ''}" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
        </div>
        <button type="submit" class="w-full py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold">Update Menu</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
};

window.handleMessSave = async (e) => {
  e.preventDefault();
  const updatedMenu = { ...store.mess };
  updatedMenu['Sunday'] = {
    breakfast: document.getElementById('mm-bf').value.trim(),
    lunch: document.getElementById('mm-lunch').value.trim(),
    snacks: document.getElementById('mm-snacks').value.trim(),
    dinner: document.getElementById('mm-dinner').value.trim()
  };

  await syncSave('mess', 'master_mess_schedule', { menu: updatedMenu });
  document.getElementById('mess-modal').remove();
  showToast('Mess menu updated!', 'success');
};

window.addEventListener('load', async () => {
  await initCloudSync();
  renderApp();

  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.classList.add('opacity-0', 'pointer-events-none');
      setTimeout(() => splash.remove(), 700);
    }
  }, 1500);
});
