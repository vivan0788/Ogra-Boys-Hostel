# Ogra Boys Hostel - Digital Resident & Management Portal

Real-time digital residence, attendance, and discipline management portal built for **Ogra Boys Hostel**[span_0](start_span)[span_0](end_span). The application provides separate, role-based dashboards for hostel residents and the Chief Warden Desk, synchronized in real time via Firebase Firestore[span_1](start_span)[span_1](end_span).

---

## 📌 Features

### 👨‍🎓 Student Dashboard
- **Live Attendance Overview**: Real-time percentage tracking and daily verification logs[span_2](start_span)[span_2](end_span).
- **Digital Gate Pass**: Apply for Day, Home, or Emergency outpasses with verified security passcodes[span_3](start_span)[span_3](end_span).
- **Grievance Logging**: Report electrical, plumbing, carpentry, internet, and housekeeping issues[span_4](start_span)[span_4](end_span).
- **Mess Menu & Helplines**: View daily hostel meal schedules and campus emergency contact numbers[span_5](start_span)[span_5](end_span).
- **Official Notices**: Live stream of urgent, maintenance, and administrative announcements[span_6](start_span)[span_6](end_span).

### 🛡️ Chief Warden Admin Desk
- **Master Setup Authorization**: Protected initial setup requiring a private master PIN (`OGRA@1234`)[span_7](start_span)[span_7](end_span).
- **Admission Approvals**: Review, approve, or decline new resident admission applications[span_8](start_span)[span_8](end_span).
- **Resident Directory**: Searchable list of all approved students with direct one-tap calling and room/floor details[span_9](start_span)[span_9](end_span).
- **Night Roll Call (Attendance)**: Single-tap daily attendance marking (Present, Absent, On Leave)[span_10](start_span)[span_10](end_span).
- **Gate Pass Authorization**: Approve, reject, or mark return completion for student outpasses[span_11](start_span)[span_11](end_span).
- **Grievance Redressal**: Update status (Pending, In Progress, Resolved) and attach repair remarks[span_12](start_span)[span_12](end_span).
- **Broadcast Announcements**: Post real-time urgent or general notices directly to all resident devices[span_13](start_span)[span_13](end_span).

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES Modules), Tailwind CSS (CDN)[span_14](start_span)[span_14](end_span)
- **Icons & Fonts**: Phosphor Icons, Google Fonts (Plus Jakarta Sans)[span_15](start_span)[span_15](end_span)
- **Database & Sync**: Firebase Firestore (Realtime Cloud Sync)[span_16](start_span)[span_16](end_span)
- **Authentication**: Firebase Anonymous Auth (session-managed role access)[span_17](start_span)[span_17](end_span)

---

## 📁 Project Structure

```text
├── index.html       # Application markup and responsive shell[span_18](start_span)[span_18](end_span)
├── style.css        # Custom CSS animations and utility styles[span_19](start_span)[span_19](end_span)
├── app.js           # Full client-side application logic & Firebase integration[span_20](start_span)[span_20](end_span)
└── README.md        # Project documentation
