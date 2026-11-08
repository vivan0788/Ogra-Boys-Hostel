# Ogra Boys Hostel - Digital Resident & Management Portal

Real-time digital residence, attendance, and discipline management portal built for **Ogra Boys Hostel**. The application provides separate, role-based dashboards for hostel residents and the Chief Warden Desk, synchronized in real time via Firebase Firestore.

---

## 📌 Features

### 👨‍🎓 Student Dashboard
- **Live Attendance Overview**: Real-time percentage tracking and daily verification logs.
- **Digital Gate Pass**: Apply for Day, Home, or Emergency outpasses with verified security passcodes.
- **Grievance Logging**: Report electrical, plumbing, carpentry, internet, and housekeeping issues.
- **Mess Menu & Helplines**: View daily hostel meal schedules and campus emergency contact numbers.
- **Official Notices**: Live stream of urgent, maintenance, and administrative announcements.

### 🛡️ Chief Warden Admin Desk
- **Master Setup Authorization**: Protected initial setup requiring a private master PIN (`OXXXXXXX`).
- **Admission Approvals**: Review, approve, or decline new resident admission applications.
- **Resident Directory**: Searchable list of all approved students with direct one-tap calling and room/floor details.
- **Night Roll Call (Attendance)**: Single-tap daily attendance marking (Present, Absent, On Leave).
- **Gate Pass Authorization**: Approve, reject, or mark return completion for student outpasses.
- **Grievance Redressal**: Update status (Pending, In Progress, Resolved) and attach repair remarks.
- **Broadcast Announcements**: Post real-time urgent or general notices directly to all resident devices.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES Modules), Tailwind CSS (CDN).
- **Icons & Fonts**: Phosphor Icons, Google Fonts (Plus Jakarta Sans).
- **Database & Sync**: Firebase Firestore (Realtime Cloud Sync).
- **Authentication**: Firebase Anonymous Auth (session-managed role access).

---

## 📁 Project Structure

```text
├── index.html       # Application markup and responsive shell
├── style.css        # Custom CSS animations and utility styles
├── app.js           # Full client-side application logic & Firebase integration
└── README.md        # Project documentation
