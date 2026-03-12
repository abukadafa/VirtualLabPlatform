// @ts-nocheck
import { useState, useEffect, useRef } from "react";
/** @jsxImportSource react */
import "./AcetelDashboard.css";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, FunnelChart, Funnel, LabelList
} from "recharts";

// ─── MOCK DATA ──────────────────────────────────────────────────────────────

const initialNationalities = [
  { country: "Ghana", count: 0, lat: 7.9, lng: -1.0 },
  { country: "Nigeria", count: 0, lat: 9.1, lng: 8.7 },
  { country: "Kenya", count: 0, lat: -0.02, lng: 37.9 },
  { country: "Senegal", count: 0, lat: 14.5, lng: -14.5 },
  { country: "Ethiopia", count: 0, lat: 9.1, lng: 40.5 },
  { country: "Côte d'Ivoire", count: 0, lat: 7.5, lng: -5.5 },
  { country: "Tanzania", count: 0, lat: -6.4, lng: 35.0 },
  { country: "Cameroon", count: 0, lat: 3.9, lng: 11.5 },
  { country: "Rwanda", count: 0, lat: -1.9, lng: 29.9 },
  { country: "Uganda", count: 0, lat: 1.4, lng: 32.3 },
];

const initialSemesterDistribution = [
  { semester: "Sem 1", count: 0 },
  { semester: "Sem 2", count: 0 },
  { semester: "Sem 3", count: 0 },
  { semester: "Sem 4", count: 0 },
  { semester: "Sem 5", count: 0 },
  { semester: "Sem 6", count: 0 },
  { semester: "Sem 7", count: 0 },
  { semester: "Sem 8", count: 0 },
  { semester: "Sem 9", count: 0 },
  { semester: "Sem 10", count: 0 },
  { semester: "Sem 11", count: 0 },
  { semester: "Sem 12", count: 0 },
];

const ACETEL_SESSIONS = ["2021_1", "2021_2", "2022_1", "2022_2", "2023_1", "2023_2", "2024_1", "2024_2", "2025_2", "2026_1"];

const COLORS = ["#1e3a8a", "#2563eb", "#3b82f6", "#0ea5e9", "#008751", "#10b981"];

const pieData = [];

const graduationPredictions = [];

const aiModelAccuracy = [];

const recentStudents = [];

const mockApplications = [];

const mockAlumni = [];

// ─── ROLE DEFINITIONS ────────────────────────────────────────────────────────

const ROLES = {
  admin: {
    label: "System Administrator",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.3)",
    icon: "🛡️",
    description: "Full system access. Manage users, configure system, view all data.",
    permissions: ["all"],
  },
  coordinator: {
    label: "Programme Coordinator",
    color: "#6366f1",
    bg: "rgba(99,102,241,0.12)",
    border: "rgba(99,102,241,0.3)",
    icon: "📋",
    description: "Manage programme records, student progress, graduation tracking, supervisor allocation.",
    permissions: ["view_dashboard","manage_students","manage_supervisors","view_admissions","view_ai","view_recruitment"],
  },
  faculty: {
    label: "Faculty Officer",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.3)",
    icon: "🎓",
    description: "Review student academic records, mark progress, view assigned students and reports.",
    permissions: ["view_dashboard","view_students","view_supervisors","view_ai"],
  },
  admissions: {
    label: "Admissions Officer",
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.3)",
    icon: "📨",
    description: "Process applications, manage admission decisions, upload applicant data.",
    permissions: ["view_dashboard","manage_admissions","view_recruitment"],
  },
  technical: {
    label: "Technical Staff",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.3)",
    icon: "⚙️",
    description: "System maintenance, data uploads, integration management, audit logs.",
    permissions: ["view_dashboard","upload_data","view_logs","manage_integrations"],
  },
};

const initialUsers = [];

// ─── COMPONENTS ─────────────────────────────────────────────────────────────

const KPICard = ({ title, value, sub, icon, trend, color }) => (
  <div style={{
    background: "#ffffff",
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: 16,
    padding: "20px 24px",
    position: "relative",
    overflow: "hidden",
    transition: "transform 0.2s, box-shadow 0.2s",
    cursor: "default",
    boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 10px 25px ${color}15`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)"; }}
  >
    <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle at top right, ${color}10, transparent)`, borderRadius: "0 16px 0 80px" }} />
    <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
    <div style={{ fontSize: 32, fontWeight: 900, color: "#1e3a8a", fontFamily: "'Space Mono', monospace", letterSpacing: -1 }}>{value}</div>
    <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, fontWeight: 600 }}>{title}</div>
    <div style={{ fontSize: 12, color: trend?.startsWith("+") ? "#008751" : trend?.startsWith("-") ? "#b91c1c" : "#64748b", marginTop: 6, fontWeight: 700 }}>
      {trend} {sub}
    </div>
  </div>
);

const SectionHeader = ({ title, subtitle, theme = "light" }) => (
  <div style={{ marginBottom: 20 }}>
    <h2 style={{ fontSize: 18, fontWeight: 800, color: theme === "dark" ? "#f8fafc" : "#1e3a8a", margin: 0, fontFamily: "'Syne', sans-serif", letterSpacing: -0.3 }}>{title}</h2>
    {subtitle && <p style={{ fontSize: 13, color: theme === "dark" ? "#94a3b8" : "#64748b", margin: "4px 0 0", fontWeight: 500 }}>{subtitle}</p>}
  </div>
);

const Badge = ({ text, type }) => {
  const colors = { 
    HIGH: ["#dc2626", "#fef2f2", "#fecaca"], 
    MEDIUM: ["#d97706", "#fffbeb", "#fde68a"], 
    LOW: ["#008751", "#ecfdf5", "#d1fae5"], 
    Active: ["#1e40af", "#eff6ff", "#dbeafe"], 
    Pending: ["#d97706", "#fffbeb", "#fde68a"],
    Graduated: ["#008751", "#f0fdf4", "#bbf7d0"],
    Inactive: ["#64748b", "#f1f5f9", "#e2e8f0"]
  };
  const [text_c, bg_c, border_c] = colors[text] || colors[type] || ["#1e3a8a", "#eff6ff", "#dbeafe"];
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20, background: bg_c, color: text_c, border: `1px solid ${border_c}`, letterSpacing: 0.3, display: "inline-flex", alignItems: "center" }}>
      {text || type}
    </span>
  );
};

const ProgressBar = ({ value, max, color }) => {
  const pct = Math.min((value / max) * 100, 100);
  const c = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#10b981";
  return (
    <div style={{ background: "#f1f5f9", borderRadius: 4, height: 6, overflow: "hidden", border: "1px solid rgba(0,0,0,0.03)" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color || c, borderRadius: 4, transition: "width 0.8s ease" }} />
    </div>
  );
};

// ─── TABS ────────────────────────────────────────────────────────────────────

const NAV_TABS = [
  { id: "overview", label: "Dashboard", icon: "⚡" },
  { id: "students", label: "Students", icon: "👤" },
  { id: "admissions", label: "Admissions", icon: "📋" },
  { id: "supervisors", label: "Supervisors", icon: "👨‍🏫" },
  { id: "facilitators", label: "Facilitators", icon: "🧑‍🏫" },
  { id: "ecosystem", label: "Ecosystem", icon: "🌐" },
  { id: "alumni", label: "Alumni & Grads", icon: "🎓" },
  { id: "ai", icon: "🤖", label: "AI Insights" },
  { id: "recruitment", label: "Recruitment Map", icon: "🌍" },
  { id: "users", label: "User Management", icon: "🔐", adminOnly: true },
];

const PROGRAMMES = [
  "MSc Artificial Intelligence",
  "MSc Cybersecurity",
  "MSc Management Information System",
  "PhD Artificial Intelligence",
  "PhD Cybersecurity",
  "PhD Management Information System"
];

// ─── OVERVIEW TAB ────────────────────────────────────────────────────────────

const OverviewTab = ({ data, setActiveTab }) => {
  const { students, applications, supervisors, metrics } = data;

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        <div onClick={() => setActiveTab("students")} style={{ cursor: "pointer" }}>
          <KPICard title="Total Students" value={students.length} sub="vs last year" trend="0%" icon="🎓" color="#3b82f6" />
        </div>
        <div onClick={() => setActiveTab("students")} style={{ cursor: "pointer" }}>
          <KPICard title="MSc Students" value={students.filter(s => s.prog.includes("MSc")).length} sub="active" trend="0%" icon="📘" color="#6366f1" />
        </div>
        <div onClick={() => setActiveTab("students")} style={{ cursor: "pointer" }}>
          <KPICard title="PhD Students" value={students.filter(s => s.prog.includes("PhD")).length} sub="active" trend="0%" icon="🔬" color="#8b5cf6" />
        </div>
        <div style={{ cursor: "default" }}>
          <KPICard title="At-Risk Students" value={metrics.atRiskCount} sub="need attention" trend="0" icon="⚠️" color="#ef4444" />
        </div>
        <div onClick={() => setActiveTab("alumni")} style={{ cursor: "pointer" }}>
          <KPICard title="Avg. Completion" value={metrics.completionRate + "%"} sub="graduation rate" trend="0%" icon="✅" color="#10b981" />
        </div>
        <div onClick={() => setActiveTab("supervisors")} style={{ cursor: "pointer" }}>
          <KPICard title="Supervisors" value={supervisors.length} sub="on platform" trend="0 overloaded" icon="👨‍🏫" color="#f59e0b" />
        </div>
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <SectionHeader title="Student Enrollment Growth" subtitle="MSc & PhD intake by year" />
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={metrics.growthData}>
              <defs>
                <linearGradient id="gMsc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPhd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
              <XAxis dataKey="year" stroke="#cbd5e1" tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }} />
              <YAxis stroke="#cbd5e1" tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }} />
              <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", color: "#1e293b" }} />
              <Legend wrapperStyle={{ color: "#475569", fontSize: 13, fontWeight: 700 }} />
              <Area type="monotone" dataKey="msc" stroke="#1e3a8a" fill="url(#gMsc)" strokeWidth={3} name="MSc" />
              <Area type="monotone" dataKey="phd" stroke="#3b82f6" fill="url(#gPhd)" strokeWidth={3} name="PhD" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <SectionHeader title="Admission Funnel" subtitle="Current academic year" />
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
            {metrics.funnelData.map((item, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: "#475569", fontWeight: 500 }}>{item.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", fontFamily: "'Space Mono', monospace" }}>{item.value || 0}</span>
                </div>
                <ProgressBar value={item.value || 0} max={Math.max(1, metrics.funnelData[0].value)} color={item.fill} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <SectionHeader title="Program Performance" subtitle="Students per department" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={metrics.performanceData} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
              <XAxis dataKey="program" stroke="#cbd5e1" tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }} />
              <YAxis stroke="#cbd5e1" tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }} />
              <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", color: "#1e293b" }} />
              <Legend wrapperStyle={{ color: "#475569", fontSize: 11, fontWeight: 500 }} />
              <Bar dataKey="msc" fill="#008751" radius={[4, 4, 0, 0]} name="MSc" />
              <Bar dataKey="phd" fill="#10b981" radius={[4, 4, 0, 0]} name="PhD" />
              <Bar dataKey="admitted" fill="#059669" radius={[4, 4, 0, 0]} name="Admitted" />
              <Bar dataKey="graduated" fill="#166534" radius={[4, 4, 0, 0]} name="Graduated" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <SectionHeader title="Semester Distribution" subtitle="Students by current semester" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={metrics.semesterData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
              <XAxis dataKey="semester" stroke="#cbd5e1" tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }} />
              <YAxis stroke="#cbd5e1" tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }} />
              <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", color: "#1e293b" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Students">
                {metrics.semesterData?.map((_, i) => <Cell key={i} fill={i >= 6 ? "#dc2626" : "#008751"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* At Risk List (Mini) */}
      <div style={{ background: "rgba(220,38,38,0.02)", border: "1px solid rgba(220,38,38,0.1)", borderRadius: 16, padding: 20 }}>
        <SectionHeader title="⚠️ Alert Panel" subtitle="Students requiring immediate attention" />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {students.filter(s => s.remaining <= 1 || s.status === "Inactive").slice(0, 5).map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, background: "#ffffff", border: "1px solid rgba(0,0,0,0.04)", borderRadius: 10, padding: "12px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.01)" }}>
              <Badge text={s.status === "Inactive" ? "HIGH" : "MEDIUM"} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{s.name} <span style={{ color: "#64748b", fontSize: 12, fontWeight: 500 }}>· {s.prog}</span></div>
                <div style={{ fontSize: 12, color: "#dc2626", marginTop: 2, fontWeight: 500 }}>{s.status === "Inactive" ? "Dormant account" : "Near completion threshold"}</div>
              </div>
              <div style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>Sem {s.sem} · Remaining {s.remaining}</div>
              <button style={{ fontSize: 11, padding: "5px 14px", background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 20, color: "#dc2626", cursor: "pointer", fontWeight: 700 }}>
                Take Action
              </button>
            </div>
          ))}
          {students.filter(s => s.remaining <= 1 || s.status === "Inactive").length === 0 && (
            <div style={{ textAlign: "center", color: "#64748b", padding: 20, fontSize: 13, fontWeight: 500 }}>No students currently flagged as at-risk.</div>
          )}
        </div>
      </div>

      {/* Footer Addition */}
      <div style={{ 
        marginTop: 40, 
        paddingTop: 24, 
        borderTop: "1px solid rgba(0,0,0,0.06)", 
        textAlign: "center",
        color: "#64748b"
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>© 2026 SDMS</div>
        <div style={{ fontSize: 12, fontWeight: 500 }}>Africa Centre of Excellence on Technology Enhanced Learning</div>
      </div>
    </div>
  );
};

// ─── STUDENTS TAB ────────────────────────────────────────────────────────────

const StudentsTab = ({ data, onEdit, onDelete, onHistory, onAddStudent, progFilter, setProgFilter, setActiveTab }) => {
  const [search, setSearch] = useState("");
  const [view, setView] = useState("registered"); // registered | admitted
  
  const students = (data.students || []).filter(s => progFilter === "All Programmes" || s.prog === progFilter);
  const applications = (data.applications || []).filter(a => progFilter === "All Programmes" || a.prog === progFilter);
  
  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.prog.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAdmitted = applications.filter(a => a.status === "Admitted").filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.prog.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <KPICard title="Registered Students" value={students.length} trend="active" sub="this semester" icon="📚" color="#3b82f6" />
        <KPICard title="Admitted (Pending Reg)" value={applications.filter(a => a.status === "Admitted").length} trend="new" sub="admissions" icon="✅" color="#10b981" />
        <div onClick={() => setActiveTab("supervisors")} style={{ cursor: "pointer" }}>
          <KPICard title="Unassigned Supervisors" value={students.filter(s => s.supervisor === "Unassigned").length} trend="none" sub="Click to assign" icon="🔗" color="#ef4444" />
        </div>
        <KPICard title="Expected Grads" value={students.filter(s => s.remaining <= 1).length} trend="none" sub="" icon="🎓" color="#8b5cf6" />
      </div>

      {/* View Toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, padding: 4, background: "#f1f5f9", borderRadius: 12, width: "fit-content", border: "1px solid rgba(0,0,0,0.04)" }}>
        <button 
          onClick={() => setView("registered")}
          style={{ 
            padding: "8px 20px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
            background: view === "registered" ? "#008751" : "transparent",
            color: view === "registered" ? "#fff" : "#64748b",
            transition: "all 0.2s"
          }}
        >
          Registered Student
        </button>
        <button 
          onClick={() => setView("admitted")}
          style={{ 
            padding: "8px 20px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
            background: view === "admitted" ? "#008751" : "transparent",
            color: view === "admitted" ? "#fff" : "#64748b",
            transition: "all 0.2s"
          }}
        >
          Admitted students
        </button>
      </div>

      {/* Search + Table */}
      <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <SectionHeader title={view === "registered" ? "Student Details" : "Admitted Student List"} subtitle={view === "registered" ? "Complete student lifecycle view" : "Verified admissions pending registration"} />
          <div style={{ display: "flex", gap: 10 }}>
            <select
              value={progFilter}
              onChange={e => setProgFilter(e.target.value)}
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", color: "#1e293b", fontSize: 13, outline: "none", fontWeight: 500 }}
            >
              <option value="All Programmes">All Programmes</option>
              {PROGRAMMES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${view}...`}
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 14px", color: "#1e293b", fontSize: 13, outline: "none", width: 180, fontWeight: 500 }}
            />
            {view === "registered" && <button onClick={onAddStudent} style={{ background: "#008751", border: "none", borderRadius: 8, padding: "8px 16px", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>+ Add Student</button>}
          </div>
        </div>
        
        <div style={{ overflowX: "auto" }}>
          {view === "registered" ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Matric #", "Name", "Programme", "Entry", "Sem", "Rem", "Supervisor", "Grad", "Status", "Actions"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "12px 14px", fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: 0.8, borderBottom: "2px solid #e2e8f0", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(30,58,138,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "14px 14px", fontSize: 12, color: "#1e3a8a", fontWeight: 800, fontFamily: "'Space Mono', monospace" }}>{s.id}</td>
                    <td style={{ padding: "14px 14px", fontSize: 13, color: "#1e293b", fontWeight: 800 }}>{s.name}</td>
                    <td style={{ padding: "14px 14px", fontSize: 12, color: "#475569", fontWeight: 500 }}>{s.prog}</td>
                    <td style={{ padding: "14px 14px", fontSize: 12, color: "#64748b", fontFamily: "'Space Mono', monospace" }}>{s.entry}</td>
                    <td style={{ padding: "14px 14px", fontSize: 12, color: "#1e3a8a", fontWeight: 800, fontFamily: "'Space Mono', monospace" }}>{s.sem}</td>
                    <td style={{ padding: "14px 14px", fontSize: 12, color: s.remaining <= 2 ? "#d97706" : "#64748b", fontWeight: 800, fontFamily: "'Space Mono', monospace" }}>{s.remaining}</td>
                    <td style={{ padding: "14px 14px", fontSize: 12, color: s.supervisor === "Unassigned" ? "#dc2626" : "#475569", fontWeight: 600 }}>{s.supervisor}</td>
                    <td style={{ padding: "14px 14px", fontSize: 12, color: "#1e40af", fontWeight: 800, fontFamily: "'Space Mono', monospace" }}>{s.gradYear}</td>
                    <td style={{ padding: "14px 14px" }}><Badge type={s.status} text={s.status} /></td>
                    <td style={{ padding: "14px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={(e) => {e.stopPropagation(); onEdit(s, 'student');}} style={{ fontSize: 10, padding: "6px 10px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, color: "#d97706", cursor: "pointer", fontWeight: 700, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>Edit</button>
                        <button onClick={(e) => {e.stopPropagation(); onDelete(s);}} style={{ fontSize: 10, padding: "6px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, color: "#dc2626", cursor: "pointer", fontWeight: 700, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>Delete</button>
                        <button onClick={(e) => {e.stopPropagation(); onHistory(s);}} style={{ fontSize: 10, padding: "6px 10px", background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: 6, color: "#1e40af", cursor: "pointer", fontWeight: 700, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>Summary Trail</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Name", "Programme", "Degree", "CGPA", "Nationality", "Applied", "Status", "Actions"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: 0.5, borderBottom: "1px solid rgba(255,255,255,0.07)", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAdmitted.map((a, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "#0f172a", fontWeight: 700 }}>{a.name}</td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: "#475569", fontWeight: 500 }}>{a.prog}</td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: "#475569", fontWeight: 500 }}>{a.degree}</td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: "#059669", fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{a.cgpa}</td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: "#475569", fontWeight: 500 }}>{a.nat}</td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: "#64748b", fontWeight: 500 }}>{a.date}</td>
                    <td style={{ padding: "12px 14px" }}><Badge type={a.status} text={a.status} /></td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={(e) => {e.stopPropagation(); onEdit&&onEdit(a, 'application');}} style={{ fontSize: 10, padding: "6px 10px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, color: "#d97706", cursor: "pointer", fontWeight: 700 }}>Edit</button>
                        <button onClick={(e) => {e.stopPropagation(); onDelete&&onDelete(a);}} style={{ fontSize: 10, padding: "6px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, color: "#dc2626", cursor: "pointer", fontWeight: 700 }}>Delete</button>
                        <button onClick={(e) => {e.stopPropagation(); onHistory&&onHistory(a);}} style={{ fontSize: 10, padding: "6px 10px", background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: 6, color: "#1e40af", cursor: "pointer", fontWeight: 700 }}>Summary Trail</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredAdmitted.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 40, color: "#64748b" }}>No admitted applicants found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── ALUMNI & GRADUATES TAB ──────────────────────────────────────────────────

const AlumniTab = ({ data, onEdit, onDelete, onHistory, onMessage }) => {
  const [search, setSearch] = useState("");
  const alumni = data.alumni || [];
  const filtered = alumni.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.employer.toLowerCase().includes(search.toLowerCase()) ||
    a.prog.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <KPICard title="Total Alumni" value="0" trend="0" sub="vs last year" icon="🎓" color="#8b5cf6" />
        <KPICard title="Employment Rate" value="0%" trend="post-grad" sub="" icon="💼" color="#10b981" />
        <KPICard title="Top Employer Map" value="None" trend="Industry focus" sub="" icon="🏢" color="#3b82f6" />
        <KPICard title="Engaged Alumni" value="0%" trend="Active in network" sub="" icon="🤝" color="#f59e0b" />
      </div>

      <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <SectionHeader title="Alumni & Graduates Directory" subtitle="Explore graduate placement and network engagement" />
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search alumni, employers..."
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 14px", color: "#1e293b", fontSize: 13, outline: "none", width: 220, fontWeight: 500 }}
            />
            <button onClick={() => onMessage && onMessage()} style={{ background: "#1e3a8a", border: "none", borderRadius: 8, padding: "8px 16px", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>Message Network</button>
          </div>
        </div>
        
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Alumni", "Programme", "Grad Year", "Current Employer", "Job Role", "Location", "Engagement", "Actions"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: 0.5, borderBottom: "1px solid rgba(0,0,0,0.06)", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                  <td style={{ padding: "13px 14px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: "#64748b", fontFamily: "'Space Mono', monospace", marginTop: 2, fontWeight: 500 }}>{a.id}</div>
                  </td>
                  <td style={{ padding: "13px 14px", fontSize: 12, color: "#475569", fontWeight: 500 }}>{a.prog}</td>
                  <td style={{ padding: "13px 14px", fontSize: 12, color: "#059669", fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{a.gradYear}</td>
                  <td style={{ padding: "13px 14px", fontSize: 13, color: "#0f172a", fontWeight: 700 }}>{a.employer}</td>
                  <td style={{ padding: "13px 14px", fontSize: 12, color: "#475569", fontWeight: 500 }}>{a.role}</td>
                  <td style={{ padding: "13px 14px", fontSize: 12, color: "#64748b", fontWeight: 500 }}>{a.location}</td>
                  <td style={{ padding: "13px 14px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, 
                      background: a.engagement === "High" ? "#d1fae5" : a.engagement === "Medium" ? "#fef3c7" : "#fee2e2", 
                      color: a.engagement === "High" ? "#059669" : a.engagement === "Medium" ? "#d97706" : "#dc2626", 
                      border: `1px solid ${a.engagement === "High" ? "#a7f3d0" : a.engagement === "Medium" ? "#fde68a" : "#fecaca"}` }}>
                      {a.engagement}
                    </span>
                  </td>
                  <td style={{ padding: "13px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={(e) => {e.stopPropagation(); onMessage&&onMessage(a);}} style={{ fontSize: 10, padding: "6px 10px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, color: "#166534", cursor: "pointer", fontWeight: 700, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>Message</button>
                      <button onClick={(e) => {e.stopPropagation(); onEdit&&onEdit(a, 'alumni');}} style={{ fontSize: 10, padding: "6px 10px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, color: "#d97706", cursor: "pointer", fontWeight: 700, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>Edit</button>
                      <button onClick={(e) => {e.stopPropagation(); onDelete&&onDelete(a);}} style={{ fontSize: 10, padding: "6px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, color: "#dc2626", cursor: "pointer", fontWeight: 700, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>Delete</button>
                      <button onClick={(e) => {e.stopPropagation(); onHistory&&onHistory(a);}} style={{ fontSize: 10, padding: "6px 10px", background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: 6, color: "#1e40af", cursor: "pointer", fontWeight: 700, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>Summary Trail</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── ADMISSIONS TAB ──────────────────────────────────────────────────────────

const AdmissionsTab = ({ data, onEdit, onDelete, onHistory }) => {
  const { applications, metrics } = data;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <KPICard title="Total Applicants" value={applications.length} trend="0%" sub="vs last cycle" icon="📨" color="#3b82f6" />
        <KPICard title="Admitted" value={applications.filter(a => a.status === "Admitted").length} trend="0%" sub="acceptance rate" icon="✉️" color="#10b981" />
        <KPICard title="Pending Review" value={applications.filter(a => a.status === "Pending").length} trend="none" sub="" icon="⏳" color="#f59e0b" />
        <KPICard title="Enrolled" value="0" trend="0%" sub="yield rate" icon="📝" color="#8b5cf6" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 24 }}>
          <SectionHeader title="Applications by Programme" subtitle="Current admissions cycle" />
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={metrics.performanceData} dataKey="msc" nameKey="program" cx="50%" cy="50%" outerRadius={85} innerRadius={45}>
                {metrics.performanceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }} />
              <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <SectionHeader title="Admission Funnel Progress" subtitle="Step-by-step conversion" />
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
            {metrics.funnelData.map((item, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>{item.name}</span>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>{i > 0 && metrics.funnelData[i - 1].value > 0 ? `${Math.round((item.value / metrics.funnelData[i - 1].value) * 100)}% conversion` : "100%"}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#1e3a8a", fontFamily: "'Space Mono', monospace", width: 40, textAlign: "right" }}>{item.value}</span>
                  </div>
                </div>
                <ProgressBar value={item.value} max={metrics.funnelData[0].value || 1} color={item.fill} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 24, marginTop: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <SectionHeader title="Recent Applications" subtitle="Latest submissions for review" />
          <button onClick={() => document.getElementById("global-excel-upload")?.click()} style={{ background: "#1e3a8a", border: "none", borderRadius: 8, padding: "8px 16px", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>Upload Excel</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Applicant", "Programme", "Degree", "CGPA", "Nationality", "Applied", "Status", "Actions"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 14px", fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: 1, borderBottom: "2px solid #e2e8f0", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {applications.map((a, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "14px 14px", fontSize: 13, color: "#1e3a8a", fontWeight: 700 }}>{a.name}</td>
                  <td style={{ padding: "14px 14px", fontSize: 12, color: "#475569", fontWeight: 500 }}>{a.prog}</td>
                  <td style={{ padding: "14px 14px", fontSize: 12, color: "#64748b" }}>{a.degree}</td>
                  <td style={{ padding: "14px 14px", fontSize: 12, color: "#008751", fontWeight: 800, fontFamily: "'Space Mono', monospace" }}>{a.cgpa}</td>
                  <td style={{ padding: "14px 14px", fontSize: 12, color: "#475569" }}>{a.nat}</td>
                  <td style={{ padding: "14px 14px", fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>{a.date}</td>
                  <td style={{ padding: "14px 14px" }}><Badge type={a.status} text={a.status} /></td>
                  <td style={{ padding: "14px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={(e) => {e.stopPropagation(); onEdit&&onEdit(a);}} style={{ fontSize: 10, padding: "6px 10px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, color: "#d97706", cursor: "pointer", fontWeight: 700 }}>Edit</button>
                      <button onClick={(e) => {e.stopPropagation(); onDelete&&onDelete(a);}} style={{ fontSize: 10, padding: "6px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, color: "#dc2626", cursor: "pointer", fontWeight: 700 }}>Delete</button>
                      <button onClick={(e) => {e.stopPropagation(); onHistory&&onHistory(a);}} style={{ fontSize: 10, padding: "6px 10px", background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: 6, color: "#1e40af", cursor: "pointer", fontWeight: 700 }}>Summary Trail</button>
                    </div>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 60, color: "#94a3b8", fontSize: 14 }}>No recent applications found. Upload Excel to populate.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── SUPERVISORS TAB ─────────────────────────────────────────────────────────

const SupervisorsTab = ({ data, onEdit, onDelete, onHistory }) => {
  const supervisors = data.supervisors || [];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <KPICard title="Total Supervisors" value={supervisors.length} trend="none" sub="" icon="👨‍🏫" color="#6366f1" />
        <KPICard title="Overloaded" value={supervisors.filter(s => s.load >= 100).length} trend="none" sub="" icon="🔴" color="#ef4444" />
        <KPICard title="Available Slots" value={supervisors.reduce((acc, s) => acc + (s.max - s.current), 0)} trend="none" sub="" icon="🟢" color="#10b981" />
        <KPICard title="Unassigned Students" value="0" trend="none" sub="" icon="🔗" color="#f59e0b" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {supervisors.map((s, i) => (
          <div key={i} style={{
            background: "#ffffff", border: `1px solid ${s.load >= 100 ? "#fee2e2" : "rgba(0,0,0,0.06)"}`,
            borderRadius: 14, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1e3a8a" }}>{s.name}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, fontWeight: 500 }}>{s.dept} · {s.expertise}</div>
              </div>
              <Badge text={s.load >= 100 ? "FULL" : s.load >= 80 ? "HIGH" : "LOW"} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13 }}>
              <span style={{ color: "#475569", fontWeight: 600 }}>Students</span>
              <span style={{ color: "#1e3a8a", fontWeight: 800, fontFamily: "'Space Mono', monospace" }}>{s.current}/{s.max}</span>
            </div>
            <ProgressBar value={s.current} max={s.max} color={s.load >= 100 ? "#ef4444" : "#1e40af"} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16, borderTop: "1px solid rgba(0,0,0,0.04)", paddingTop: 12 }}>
              <button onClick={() => onEdit?.(s, 'supervisor')} style={{ flex: 1, fontSize: 10, padding: "6px 8px", background: "#fefce8", border: "1px solid #fef08a", borderRadius: 6, color: "#d97706", cursor: "pointer", fontWeight: 700 }}>Edit</button>
              <button onClick={() => onDelete?.(s)} style={{ flex: 1, fontSize: 10, padding: "6px 8px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, color: "#dc2626", cursor: "pointer", fontWeight: 700 }}>Delete</button>
              <button onClick={() => onHistory?.(s)} style={{ flex: 1, fontSize: 10, padding: "6px 8px", background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: 6, color: "#1e40af", cursor: "pointer", fontWeight: 700 }}>Log</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <SectionHeader title="Supervisor Distribution" subtitle="Project load by programme discipline" />
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={["#008751", "#10b981", "#059669", "#34d399"][i % 4]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 10, color: "#1e293b", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
              <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11, fontWeight: 500, paddingTop: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <SectionHeader title="Staff Load Analysis" subtitle="Top supervisors by current student load %" />
          <div style={{ height: 220, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={supervisors.slice(0, 5)} layout="vertical" barSize={10}>
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }} hide />
                <YAxis dataKey="name" type="category" width={110} tick={{ fill: "#475569", fontSize: 10, fontWeight: 600 }} tickFormatter={v => v.split(" ").slice(-1)[0]} />
                <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, color: "#1e293b", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }} formatter={v => `${v}%`} />
                <Bar dataKey="load" radius={[0, 4, 4, 0]} name="Load %">
                  {supervisors.slice(0, 5).map((s, i) => <Cell key={i} fill={s.load >= 100 ? "#ef4444" : s.load >= 70 ? "#f59e0b" : "#008751"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 16, padding: 24, marginTop: 20 }}>
        <SectionHeader title="🤖 AI Supervisor Recommendation Engine" subtitle="Automated matching based on expertise, load & student profile" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>Unassigned: <strong style={{ color: "#e2e8f0" }}>Chinyere Obi</strong> — MSc BioTech</div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>AI Match Score based on programme, CGPA & expertise</div>
            {[["Dr. Amara Diallo", "94% match", "Strategy / 3 slots open"], ["Prof. Kwame Asante", "81% match", "Climate / 0 slots — FULL"], ["Dr. Ngozi Eze", "72% match", "Quantum / 3 slots open"]].map(([name, score, note], i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: i === 0 ? "#10b981" : i === 1 ? "#ef4444" : "#f59e0b" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#e2e8f0" }}>{name}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{note}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? "#10b981" : "#64748b" }}>{score}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>Workload Distribution</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={supervisors.slice(0, 5)} layout="vertical" barSize={10}>
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={v => v.split(" ").slice(-1)[0]} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }} formatter={v => `${v}%`} />
                <Bar dataKey="load" radius={[0, 4, 4, 0]} name="Load %">
                  {supervisors.slice(0, 5).map((s, i) => <Cell key={i} fill={s.load >= 100 ? "#ef4444" : s.load >= 70 ? "#f59e0b" : "#10b981"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── AI INSIGHTS TAB ─────────────────────────────────────────────────────────

const AITab = ({ data }) => {
  const { students, metrics } = data;
  return (
    <div>
      <div style={{ background: "rgba(0,135,81,0.04)", border: "1px solid rgba(0,135,81,0.12)", borderRadius: 16, padding: 20, marginBottom: 24, display: "flex", gap: 20, alignItems: "center" }}>
        <div style={{ fontSize: 36 }}>🤖</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", fontFamily: "'Syne', sans-serif" }}>ACETEL AI Intelligence Engine</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, fontWeight: 500 }}>Powered by machine learning — graduation prediction, at-risk detection & supervisor matching</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 24 }}>
          {[["0%", "Grad Accuracy"], ["0%", "Risk Detection"], ["0%", "Supervisor Match"]].map(([v, l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#008751", fontFamily: "'Space Mono', monospace" }}>{v}</div>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <SectionHeader title="Graduation Predictions" subtitle="AI-forecasted vs actual graduates" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={graduationPredictions}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
              <XAxis dataKey="year" stroke="#cbd5e1" tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }} />
              <YAxis stroke="#cbd5e1" tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }} />
              <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", color: "#1e293b" }} />
              <Legend wrapperStyle={{ color: "#475569", fontSize: 12, fontWeight: 500 }} />
              <Bar dataKey="predicted" fill="#008751" name="AI Predicted" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" fill="#10b981" name="Actual" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <SectionHeader title="Model Performance" subtitle="AI module accuracy scores" />
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
            {aiModelAccuracy.map((m, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "#475569", fontWeight: 700 }}>{m.metric}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#1e3a8a", fontFamily: "'Space Mono', monospace" }}>{m.score}%</span>
                </div>
                <ProgressBar value={m.score} max={100} color={i === 0 ? "#1e3a8a" : i === 1 ? "#3b82f6" : "#6366f1"} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
        <SectionHeader title="Per-Student AI Predictions" subtitle="Individual graduation forecast & risk flags" />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Student", "Programme", "Grad Year", "AI Confidence", "Risk", "Supervisor", "Action"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 14px", fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: 0.8, borderBottom: "2px solid #e2e8f0", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.filter(s => s.remaining <= 2).map((s, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "14px 14px", fontSize: 13, color: "#1e3a8a", fontWeight: 800 }}>{s.name}</td>
                  <td style={{ padding: "14px 14px", fontSize: 12, color: "#475569", fontWeight: 500 }}>{s.prog}</td>
                  <td style={{ padding: "14px 14px", fontSize: 12, color: "#1e40af", fontWeight: 800, fontFamily: "'Space Mono', monospace" }}>{s.gradYear}</td>
                  <td style={{ padding: "14px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 4, height: 6 }}>
                        <div style={{ width: `85%`, height: "100%", background: "#1e3a8a", borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 11, color: "#1e3a8a", fontFamily: "'Space Mono', monospace", width: 32, fontWeight: 800 }}>85%</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 14px" }}><Badge text={s.remaining <= 1 ? "HIGH" : "MEDIUM"} /></td>
                  <td style={{ padding: "14px 14px", fontSize: 12, color: "#64748b", fontWeight: 600 }}>{s.supervisor}</td>
                  <td style={{ padding: "14px 14px" }}>
                    <button style={{ fontSize: 11, padding: "6px 14px", background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: 8, color: "#1e40af", cursor: "pointer", fontWeight: 700 }}>Analyze</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── RECRUITMENT MAP TAB ─────────────────────────────────────────────────────

const RecruitmentTab = ({ data }) => {
  const nationalities = data.nationalities || [];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <KPICard title="Countries" value={nationalities.length} trend="global reach" sub="" icon="🌍" color="#3b82f6" />
        <KPICard title="Top Country" value={nationalities.sort((a,b) => b.count - a.count)[0]?.country || "None"} trend="" sub="" icon="📍" color="#10b981" />
        <KPICard title="International Rate" value="12%" trend="of enrollment" sub="" icon="✈️" color="#8b5cf6" />
        <KPICard title="New Regions" value="3" trend="expansion" sub="" icon="📍" color="#f59e0b" />
      </div>

      <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
        <SectionHeader title="Global Student Recruitment Map" subtitle="Geographic distribution of enrolled students" />
        <div style={{ background: "#f8fafc", borderRadius: 12, padding: 20, position: "relative", minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e2e8f0" }}>
          <div style={{ color: "#334155", fontSize: 14, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌍</div>
            <div style={{ color: "#1e3a8a", fontWeight: 800 }}>Interactive Recruitment Map</div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 4, fontWeight: 600 }}>Renders with core analytics integration</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 24 }}>
              {nationalities.slice(0, 8).map((n, i) => (
                <div key={i} style={{
                  width: Math.max(45, n.count * 1.5), height: Math.max(45, n.count * 1.5),
                  borderRadius: "50%", background: "rgba(30,58,138,0.08)",
                  border: `2px solid rgba(30,58,138,0.2)`,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  fontSize: 10, color: "#475569", transition: "all 0.3s"
                }}>
                  <div style={{ fontWeight: 900, color: "#1e3a8a" }}>{n.count}</div>
                  <div style={{ fontSize: 8, fontWeight: 700 }}>{n.country.slice(0, 6)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
        <SectionHeader title="Students by Country" subtitle="Full breakdown of nationalities" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {nationalities.map((n, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#008751", flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: "#475569", fontWeight: 500 }}>{n.country}</span>
              <div style={{ flex: 2 }}>
                <ProgressBar value={n.count} max={nationalities.sort((a,b) => b.count-a.count)[0]?.count || 100} color="#008751" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", fontFamily: "'Space Mono', monospace", width: 28, textAlign: "right" }}>{n.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── USER MANAGEMENT TAB ─────────────────────────────────────────────────────

const PERMISSION_LABELS = {
  all: "Full System Access",
  view_dashboard: "View Dashboard",
  manage_students: "Manage Students",
  view_students: "View Students",
  manage_supervisors: "Manage Supervisors",
  view_supervisors: "View Supervisors",
  manage_admissions: "Manage Admissions",
  view_admissions: "View Admissions",
  view_ai: "View AI Insights",
  view_recruitment: "View Recruitment Map",
  upload_data: "Upload Data",
  view_logs: "View Audit Logs",
  manage_integrations: "Manage Integrations",
};

const EMPTY_FORM = { name: "", email: "", phone: "", role: "", dept: "", password: "", confirmPassword: "" };

const DEPT_GROUPS = [
  { key: "Artificial Intelligence", label: "Artificial Intelligence", icon: "🤖", color: "#6366f1", bg: "rgba(99,102,241,0.08)", border: "rgba(99,102,241,0.25)" },
  { key: "Cybersecurity", label: "Cybersecurity", icon: "🛡️", color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)" },
  { key: "Management Information System", label: "Management Information System", icon: "📊", color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)" },
  { key: "General Courses", label: "General Courses", icon: "📚", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)" },
];

const FacilitatorsTab = ({ data, onEdit, onDelete, onHistory }) => {
  const { facilitators } = data;

  const groupFacilitators = (dept: string) => {
    if (dept === "General Courses") {
      return facilitators.filter(f => {
        const d = (f.dept || "").toLowerCase();
        return !DEPT_GROUPS.slice(0, 3).some(g => d.includes(g.key.toLowerCase().split(" ")[0]));
      });
    }
    const keyword = dept.toLowerCase().split(" ")[0];
    return facilitators.filter(f => (f.dept || "").toLowerCase().includes(keyword));
  };

  return (
    <div>
      <SectionHeader title="Academic Facilitators" subtitle="Grouped by Discipline · AI · Cybersecurity · MIS · General Courses" />
      <div style={{ display: "flex", flexDirection: "column", gap: 32, marginTop: 24 }}>
        {DEPT_GROUPS.map(group => {
          const members = groupFacilitators(group.key);
          return (
            <div key={group.key}>
              {/* Section header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: "10px 16px", background: group.bg, border: `1px solid ${group.border}`, borderRadius: 10 }}>
                <span style={{ fontSize: 20 }}>{group.icon}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: group.color, fontFamily: "'Syne', sans-serif" }}>{group.label}</span>
                <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, padding: "3px 12px", borderRadius: 20, background: `${group.color}25`, color: group.color, border: `1px solid ${group.color}40` }}>
                  {members.length} Facilitator{members.length !== 1 ? "s" : ""}
                </span>
              </div>

              {members.length === 0 ? (
                <div style={{ fontSize: 13, color: "#64748b", textAlign: "center", padding: "16px 0", fontStyle: "italic", fontWeight: 500 }}>
                  No facilitators registered under this discipline yet.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {members.map((f, i) => (
                    <div key={i} style={{ background: "#ffffff", border: `1px solid ${group.border}`, borderRadius: 12, padding: 20, boxShadow: "0 2px 6px rgba(0,0,0,0.01)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                        <div style={{ width: 46, height: 46, borderRadius: 12, background: group.bg, border: `1px solid ${group.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                          {group.icon}
                        </div>
                        <div>
                          {f.title && <div style={{ fontSize: 10, color: group.color, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 }}>{f.title}</div>}
                          <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{f.name}</div>
                          {(f.surname || f.otherNames) && f.name !== `${f.surname} ${f.otherNames}`.trim() && (
                            <div style={{ fontSize: 11, color: "#475569", marginTop: 1, fontWeight: 500 }}>
                              {f.surname && <span><b>Surname:</b> {f.surname} </span>}
                              {f.otherNames && <span><b>Other names:</b> {f.otherNames}</span>}
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: group.color, fontWeight: 700, marginTop: 2 }}>{f.dept}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "#475569", marginBottom: 10, lineHeight: 1.6, fontWeight: 500 }}>
                        <b style={{ color: "#0f172a" }}>Expertise: </b>{f.expertise || "N/A"}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <div style={{ fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
                          <span>📧</span> {f.email || "N/A"}
                        </div>
                        {f.phone && (
                          <div style={{ fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
                            <span>📞</span> {f.phone}
                          </div>
                        )}
                        {f.office && (
                          <div style={{ fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
                            <span>🚪</span> Office: {f.office}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 16, borderTop: "1px solid rgba(0,0,0,0.04)", paddingTop: 12 }}>
                        <button onClick={() => onEdit?.(f, 'facilitator')} style={{ flex: 1, fontSize: 10, padding: "6px 8px", background: "#fefce8", border: "1px solid #fef08a", borderRadius: 6, color: "#d97706", cursor: "pointer", fontWeight: 700 }}>Edit</button>
                        <button onClick={() => onDelete?.(f)} style={{ flex: 1, fontSize: 10, padding: "6px 8px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, color: "#dc2626", cursor: "pointer", fontWeight: 700 }}>Delete</button>
                        <button onClick={() => onHistory?.(f)} style={{ flex: 1, fontSize: 10, padding: "6px 8px", background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: 6, color: "#1e40af", cursor: "pointer", fontWeight: 700 }}>Log</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {facilitators.length === 0 && (
          <div style={{ color: "#475569", textAlign: "center", padding: 40 }}>No facilitators records found. Please upload list.</div>
        )}
      </div>
    </div>
  );
};


const EcosystemTab = ({ data, onCourseStudentsUploaded, onEventAttendanceUploaded, onAddCourse, onAddEvent, onEdit, onDelete }) => {
  const { shortCourses, academicEvents } = data;
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [expandedEvent, setExpandedEvent] = useState(null);
  const API = API_URL;

  const handleCourseUpload = async (e, course) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws) as any[];
        const students = rows.map(r => ({
          name: r["Name"] || r["Full Name"] || "Unknown",
          email: r["Email"] || "",
          studentId: r["ID"] || r["Matric Number"] || "",
          organisation: r["Organisation"] || r["Institution"] || "",
        }));
        if (course.id) {
          try {
            await fetch(`${API}/api/short-courses/${course.id}/students`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ students }),
            });
          } catch (_) {}
        }
        onCourseStudentsUploaded(course, students);
        alert(`Imported ${students.length} students to "${course.title}".`);
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      alert("Error reading Excel file.");
    }
    e.target.value = "";
  };

  const handleEventUpload = async (e, event) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws) as any[];
        const attendees = rows.map(r => ({
          name: r["Name"] || r["Full Name"] || "Unknown",
          email: r["Email"] || "",
          organisation: r["Organisation"] || r["Institution"] || "",
          role: r["Role"] || "Attendee",
        }));
        if (event.id) {
          try {
            await fetch(`${API}/api/academic-events/${event.id}/attendance`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ attendees }),
            });
          } catch (_) {}
        }
        onEventAttendanceUploaded(event, attendees);
        alert(`Imported ${attendees.length} attendees to "${event.name}".`);
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      alert("Error reading Excel file.");
    }
    e.target.value = "";
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      {/* ── SHORT COURSES ── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SectionHeader title="Short Courses" subtitle="Professional Certification & Training" />
          <button onClick={onAddCourse} style={{ background: "#10b981", border: "none", borderRadius: 6, padding: "6px 14px", color: "#fff", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>+ Add Course</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
          {shortCourses.map((c, i) => (
            <div key={i} style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 6px rgba(0,0,0,0.01)" }}>
              <div style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", flex: 1 }}>{c.title}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                    <div style={{ fontSize: 11, background: "rgba(0,135,81,0.08)", color: "#008751", padding: "2px 10px", borderRadius: 10, border: "1px solid rgba(0,135,81,0.15)", fontWeight: 700 }}>{c.status}</div>
                    <button onClick={() => onEdit?.(c, 'course')} style={{ fontSize: 11, padding: "2px 8px", background: "#fefce8", border: "1px solid #fef08a", borderRadius: 6, color: "#d97706", cursor: "pointer", fontWeight: 700 }}>Edit</button>
                    <button onClick={() => onDelete?.(c)} style={{ fontSize: 11, padding: "2px 8px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, color: "#dc2626", cursor: "pointer", fontWeight: 700 }}>Delete</button>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: c.description || c.startDate || c.facilitatorName ? 8 : 12, fontWeight: 500 }}>
                  <span>⏱ {c.duration}</span>
                  <span style={{ color: (c.students?.length || c.studentsCount || 0) > 0 ? "#008751" : "#64748b", fontWeight: 800 }}>
                    👥 {c.students?.length || c.studentsCount || 0} Enrolled
                  </span>
                </div>
                {c.description && <div style={{ fontSize: 12, color: "#475569", marginBottom: 6, lineHeight: 1.5, fontWeight: 500 }}>📝 {c.description}</div>}
                {c.startDate && <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4, fontWeight: 500 }}>📅 Starts: {c.startDate}</div>}
                {c.facilitatorName && <div style={{ fontSize: 11, color: "#008751", marginBottom: 10, fontWeight: 700 }}>🧑‍🏫 {c.facilitatorName}</div>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setExpandedCourse(expandedCourse === i ? null : i)}
                    style={{ flex: 1, fontSize: 11, padding: "6px 10px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 7, color: "#a5b4fc", cursor: "pointer", fontWeight: 600 }}
                  >
                    {expandedCourse === i ? "▲ Hide Students" : "▼ View Students"}
                  </button>
                  <label style={{ flex: 1, fontSize: 11, padding: "6px 10px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 7, color: "#6ee7b7", cursor: "pointer", fontWeight: 600, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    📥 Upload Students
                    <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={e => handleCourseUpload(e, c)} />
                  </label>
                </div>
              </div>
              {expandedCourse === i && (
                <div style={{ borderTop: "1px solid rgba(0,0,0,0.04)", background: "#f8fafc", maxHeight: 220, overflowY: "auto" }}>
                  {(c.students || []).length === 0 ? (
                    <div style={{ padding: 16, fontSize: 12, color: "#64748b", textAlign: "center", fontWeight: 500 }}>No students uploaded yet. Use "Upload Students" to add.</div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          {["Name", "Email", "ID", "Organisation"].map(h => (
                            <th key={h} style={{ padding: "8px 12px", fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", textAlign: "left", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(c.students || []).map((s, si) => (
                          <tr key={si} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                            <td style={{ padding: "7px 12px", fontSize: 12, color: "#0f172a", fontWeight: 700 }}>{s.name}</td>
                            <td style={{ padding: "7px 12px", fontSize: 11, color: "#64748b", fontWeight: 500 }}>{s.email || "—"}</td>
                            <td style={{ padding: "7px 12px", fontSize: 11, color: "#008751", fontFamily: "'Space Mono', monospace", fontWeight: 800 }}>{s.studentId || "—"}</td>
                            <td style={{ padding: "7px 12px", fontSize: 11, color: "#64748b", fontWeight: 500 }}>{s.organisation || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
          {shortCourses.length === 0 && <div style={{ fontSize: 13, color: "#475569", textAlign: "center", padding: 20 }}>No short courses data.</div>}
        </div>
      </div>

      {/* ── WORKSHOPS & CONFERENCES ── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SectionHeader title="Workshops & Conferences" subtitle="Scheduled Academic Events" />
          <button onClick={onAddEvent} style={{ background: "#008751", border: "none", borderRadius: 6, padding: "6px 14px", color: "#fff", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>+ Add Event</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
          {academicEvents.map((e, i) => (
            <div key={i} style={{ background: "#ffffff", border: `1px solid ${e.type === "Workshop" ? "rgba(0,135,81,0.15)" : "rgba(16,185,129,0.15)"}`, borderRadius: 12, borderLeft: `4px solid ${e.type === "Workshop" ? "#008751" : "#10b981"}`, overflow: "hidden", boxShadow: "0 2px 6px rgba(0,0,0,0.01)" }}>
              <div style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: e.type === "Workshop" ? "#008751" : "#10b981", fontWeight: 800, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8 }}>{e.type}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{e.name}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => onEdit?.(e, 'event')} style={{ fontSize: 11, padding: "2px 8px", background: "#fefce8", border: "1px solid #fef08a", borderRadius: 6, color: "#d97706", cursor: "pointer", fontWeight: 700 }}>Edit</button>
                    <button onClick={() => onDelete?.(e)} style={{ fontSize: 11, padding: "2px 8px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, color: "#dc2626", cursor: "pointer", fontWeight: 700 }}>Delete</button>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#64748b", marginBottom: e.description || e.speaker ? 8 : 12, fontWeight: 500 }}>
                  <div style={{ display: "flex", gap: 14 }}>
                    <span>📅 {e.date}</span>
                    <span>📍 {e.location}</span>
                  </div>
                  <span style={{ color: (e.attendance?.length || 0) > 0 ? "#008751" : "#64748b", fontWeight: 800 }}>
                    🎫 {e.attendance?.length || 0} Attendees
                  </span>
                </div>
                {e.description && <div style={{ fontSize: 12, color: "#475569", marginBottom: 6, lineHeight: 1.5, fontWeight: 500 }}>📝 {e.description}</div>}
                {e.speaker && <div style={{ fontSize: 11, color: "#d97706", marginBottom: 10, fontWeight: 700 }}>🎤 Keynote: {e.speaker}</div>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setExpandedEvent(expandedEvent === i ? null : i)}
                    style={{ flex: 1, fontSize: 11, padding: "6px 10px", background: "#f8fafc", border: `1px solid #e2e8f0`, borderRadius: 7, color: "#008751", cursor: "pointer", fontWeight: 700 }}
                  >
                    {expandedEvent === i ? "▲ Hide Attendance" : "▼ View Attendance"}
                  </button>
                  <label style={{ flex: 1, fontSize: 11, padding: "6px 10px", background: "rgba(0,135,81,0.05)", border: "1px solid rgba(0,135,81,0.15)", borderRadius: 7, color: "#008751", cursor: "pointer", fontWeight: 700, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    📥 Upload Attendance
                    <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={ev => handleEventUpload(ev, e)} />
                  </label>
                </div>
              </div>
              {expandedEvent === i && (
                <div style={{ borderTop: "1px solid rgba(0,0,0,0.04)", background: "#f8fafc", maxHeight: 220, overflowY: "auto" }}>
                  {(e.attendance || []).length === 0 ? (
                    <div style={{ padding: 16, fontSize: 12, color: "#64748b", textAlign: "center", fontWeight: 500 }}>No attendance uploaded yet. Use "Upload Attendance" to add.</div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          {["Name", "Email", "Organisation", "Role"].map(h => (
                            <th key={h} style={{ padding: "8px 12px", fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", textAlign: "left", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(e.attendance || []).map((a, ai) => (
                          <tr key={ai} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                            <td style={{ padding: "7px 12px", fontSize: 12, color: "#0f172a", fontWeight: 700 }}>{a.name}</td>
                            <td style={{ padding: "7px 12px", fontSize: 11, color: "#64748b", fontWeight: 500 }}>{a.email || "—"}</td>
                            <td style={{ padding: "7px 12px", fontSize: 11, color: "#64748b", fontWeight: 500 }}>{a.organisation || "—"}</td>
                            <td style={{ padding: "7px 12px", fontSize: 11 }}>
                              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: a.role === "Speaker" ? "#fef3c7" : "#f1f5f9", color: a.role === "Speaker" ? "#d97706" : "#64748b", border: `1px solid ${a.role === "Speaker" ? "#fde68a" : "#e2e8f0"}`, fontWeight: 800 }}>{a.role || "Attendee"}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
          {academicEvents.length === 0 && <div style={{ fontSize: 13, color: "#475569", textAlign: "center", padding: 20 }}>No events scheduled.</div>}
        </div>
      </div>
    </div>
  );
};


const UserManagementTab = () => {
  const [users, setUsers] = useState(initialUsers);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [filterRole, setFilterRole] = useState("all");
  const [search, setSearch] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [activeDetailUser, setActiveDetailUser] = useState(null);
  const [saved, setSaved] = useState(false);

  const filtered = users.filter(u => {
    const matchRole = filterRole === "all" || u.role === filterRole;
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Full name is required";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = "Valid email required";
    if (!form.role) errs.role = "Please select a role";
    if (!form.dept.trim()) errs.dept = "Department is required";
    if (!editUser) {
      if (!form.password || form.password.length < 8) errs.password = "Password must be at least 8 characters";
      if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords do not match";
    }
    return errs;
  };

  const handleSubmit = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    if (editUser) {
      setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...form, role: form.role } : u));
    } else {
      setUsers(prev => [...prev, { id: Date.now(), ...form, status: "Active", lastLogin: "Never", created: new Date().toISOString().slice(0, 10) }]);
    }
    setShowModal(false); setEditUser(null); setForm(EMPTY_FORM); setFormErrors({});
    setSaved(true); setTimeout(() => setSaved(false), 3000);
  };

  const openEdit = (u) => { setEditUser(u); setForm({ name: u.name, email: u.email, phone: u.phone || "", role: u.role, dept: u.dept, password: "", confirmPassword: "" }); setFormErrors({}); setShowModal(true); };
  const openCreate = () => { setEditUser(null); setForm(EMPTY_FORM); setFormErrors({}); setShowModal(true); };

  const roleCounts = Object.keys(ROLES).reduce((acc, r) => { acc[r] = users.filter(u => u.role === r).length; return acc; }, {});

  return (
    <div>
      {/* Success toast */}
      {saved && (
        <div style={{ position: "fixed", top: 80, right: 32, background: "#10b981", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 20px rgba(16,185,129,0.4)" }}>
          ✅ User saved successfully
        </div>
      )}

      {/* Role Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
        {Object.entries(ROLES).map(([key, role]) => (
          <div key={key} onClick={() => setFilterRole(filterRole === key ? "all" : key)}
            style={{ background: filterRole === key ? role.bg : "#ffffff", border: `1px solid ${filterRole === key ? role.border : "rgba(0,0,0,0.06)"}`, borderRadius: 14, padding: "16px 18px", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{role.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: role.color, fontFamily: "'Space Mono', monospace" }}>{roleCounts[key] || 0}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, fontWeight: 600 }}>{role.label}</div>
          </div>
        ))}
        <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 14, padding: "16px 18px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>👥</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", fontFamily: "'Space Mono', monospace" }}>{users.length}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, fontWeight: 600 }}>Total Users</div>
        </div>
      </div>

      {/* Role Permission Matrix */}
      <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
        <SectionHeader title="🔐 Role Permission Matrix" subtitle="Access rights per role across the system" />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: 0.5, borderBottom: "1px solid rgba(0,0,0,0.06)", textTransform: "uppercase" }}>Permission</th>
                {Object.entries(ROLES).map(([key, role]) => (
                  <th key={key} style={{ textAlign: "center", padding: "10px 14px", fontSize: 11, color: role.color, fontWeight: 800, letterSpacing: 0.5, borderBottom: "1px solid rgba(0,0,0,0.06)", textTransform: "uppercase" }}>{role.icon} {key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(PERMISSION_LABELS).map(([perm, label]) => (
                <tr key={perm} style={{ borderBottom: "1px solid rgba(0,0,0,0.03)" }}>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#475569", fontWeight: 500 }}>{label}</td>
                  {Object.entries(ROLES).map(([key, role]) => {
                    const has = role.permissions.includes("all") || role.permissions.includes(perm);
                    return (
                      <td key={key} style={{ textAlign: "center", padding: "10px 14px" }}>
                        <span style={{ fontSize: 15 }}>{has ? "✅" : "—"}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Table */}
      <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <SectionHeader title="System Users" subtitle={`${filtered.length} user${filtered.length !== 1 ? "s" : ""} found`} />
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 14px", color: "#1e293b", fontSize: 13, outline: "none", width: 200, fontWeight: 500 }} />
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 14px", color: "#1e293b", fontSize: 13, outline: "none", fontWeight: 500 }}>
              <option value="all" style={{ background: "#fff" }}>All Roles</option>
              {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k} style={{ background: "#fff" }}>{r.label}</option>)}
            </select>
            <button onClick={openCreate} style={{ background: "#008751", border: "none", borderRadius: 8, padding: "8px 18px", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>+ Create User</button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["User", "Email", "Role", "Department", "Status", "Last Login", "Created", "Actions"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: 0.5, borderBottom: "1px solid rgba(0,0,0,0.06)", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const role = ROLES[u.role];
                return (
                  <tr key={u.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(0,135,81,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "13px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: role?.bg || "#f1f5f9", border: `1px solid ${role?.border || "#e2e8f0"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{role?.icon}</div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "13px 14px", fontSize: 12, color: "#64748b", fontWeight: 500 }}>{u.email}</td>
                    <td style={{ padding: "13px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 20, background: role?.bg, color: role?.color, border: `1px solid ${role?.border}` }}>{role?.label}</span>
                    </td>
                    <td style={{ padding: "13px 14px", fontSize: 12, color: "#475569", fontWeight: 500 }}>{u.dept}</td>
                    <td style={{ padding: "13px 14px" }}><Badge type={u.status} text={u.status} /></td>
                    <td style={{ padding: "13px 14px", fontSize: 11, color: "#64748b", fontFamily: "'Space Mono', monospace", fontWeight: 600 }}>{u.lastLogin}</td>
                    <td style={{ padding: "13px 14px", fontSize: 11, color: "#64748b", fontFamily: "'Space Mono', monospace", fontWeight: 600 }}>{u.created}</td>
                    <td style={{ padding: "13px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setActiveDetailUser(u)} style={{ fontSize: 11, padding: "5px 10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, color: "#008751", cursor: "pointer", fontWeight: 700 }}>View</button>
                        <button onClick={() => openEdit(u)} style={{ fontSize: 11, padding: "5px 10px", background: "#fefce8", border: "1px solid #fef08a", borderRadius: 6, color: "#d97706", cursor: "pointer", fontWeight: 700 }}>Edit</button>
                        <button onClick={() => setShowDeleteConfirm(u.id)} style={{ fontSize: 11, padding: "5px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, color: "#dc2626", cursor: "pointer", fontWeight: 700 }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE / EDIT MODAL ── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 20, padding: 32, width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", fontFamily: "'Syne', sans-serif" }}>{editUser ? "Edit User" : "Create New User"}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, fontWeight: 500 }}>Fill in all fields to {editUser ? "update" : "register"} a system user</div>
              </div>
              <button onClick={() => { setShowModal(false); setFormErrors({}); }} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, width: 34, height: 34, color: "#64748b", fontSize: 18, cursor: "pointer", fontWeight: 700 }}>×</button>
            </div>

            {/* Role Picker */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: "#0f172a", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 10 }}>Select Role *</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {Object.entries(ROLES).map(([key, role]) => (
                  <button key={key} onClick={() => setForm(f => ({ ...f, role: key }))}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, border: `1px solid ${form.role === key ? role.border : "#e2e8f0"}`, background: form.role === key ? role.bg : "#f8fafc", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                    <span style={{ fontSize: 20 }}>{role.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: form.role === key ? role.color : "#64748b" }}>{role.label}</div>
                      <div style={{ fontSize: 10, color: "#64748b", marginTop: 1, lineHeight: 1.4, fontWeight: 500 }}>{role.description.slice(0, 55)}...</div>
                    </div>
                  </button>
                ))}
              </div>
              {formErrors.role && <div style={{ color: "#ef4444", fontSize: 11, marginTop: 6, fontWeight: 600 }}>⚠ {formErrors.role}</div>}
            </div>

            {/* Selected Role Permissions Preview */}
            {form.role && (
              <div style={{ background: `${ROLES[form.role].bg}`, border: `1px solid ${ROLES[form.role].border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: ROLES[form.role].color, marginBottom: 8 }}>🔓 Permissions for {ROLES[form.role].label}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ROLES[form.role].permissions.map(p => (
                    <span key={p} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 12, background: "#ffffff", color: "#64748b", border: "1px solid rgba(0,0,0,0.06)", fontWeight: 700 }}>{PERMISSION_LABELS[p] || p}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { key: "name", label: "Full Name", placeholder: "e.g. Dr. Kwame Asante", type: "text" },
                { key: "email", label: "Email Address", placeholder: "user@acetel.edu", type: "email" },
                { key: "phone", label: "Phone Number", placeholder: "+233 24 000 0000", type: "tel" },
                { key: "dept", label: "Department / Unit", placeholder: "e.g. Computer Science", type: "text" },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label style={{ fontSize: 11, color: "#0f172a", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>{label} *</label>
                  <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} type={type}
                    style={{ width: "100%", background: "#f8fafc", border: `1px solid ${formErrors[key] ? "#ef4444" : "#e2e8f0"}`, borderRadius: 8, padding: "10px 14px", color: "#0f172a", fontSize: 13, outline: "none", fontWeight: 500 }} />
                  {formErrors[key] && <div style={{ color: "#ef4444", fontSize: 11, marginTop: 4, fontWeight: 600 }}>⚠ {formErrors[key]}</div>}
                </div>
              ))}

              {!editUser && <>
                <div>
                  <label style={{ fontSize: 11, color: "#0f172a", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Password *</label>
                  <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} type="password" placeholder="Min. 8 characters"
                    style={{ width: "100%", background: "#f8fafc", border: `1px solid ${formErrors.password ? "#ef4444" : "#e2e8f0"}`, borderRadius: 8, padding: "10px 14px", color: "#0f172a", fontSize: 13, outline: "none", fontWeight: 500 }} />
                  {formErrors.password && <div style={{ color: "#ef4444", fontSize: 11, marginTop: 4, fontWeight: 600 }}>⚠ {formErrors.password}</div>}
                  {form.password && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {[1,2,3,4].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: form.password.length >= i * 3 ? (form.password.length >= 12 ? "#008751" : form.password.length >= 8 ? "#f59e0b" : "#ef4444") : "#e2e8f0" }} />)}
                      </div>
                      <div style={{ fontSize: 10, color: "#64748b", marginTop: 3, fontWeight: 600 }}>{form.password.length < 6 ? "Weak" : form.password.length < 10 ? "Fair" : form.password.length < 14 ? "Good" : "Strong"}</div>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "#0f172a", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Confirm Password *</label>
                  <input value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} type="password" placeholder="Repeat password"
                    style={{ width: "100%", background: "#f8fafc", border: `1px solid ${formErrors.confirmPassword ? "#ef4444" : "#e2e8f0"}`, borderRadius: 8, padding: "10px 14px", color: "#0f172a", fontSize: 13, outline: "none", fontWeight: 500 }} />
                  {formErrors.confirmPassword && <div style={{ color: "#ef4444", fontSize: 11, marginTop: 4, fontWeight: 600 }}>⚠ {formErrors.confirmPassword}</div>}
                </div>
              </>}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowModal(false); setFormErrors({}); }} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 20px", color: "#64748b", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>Cancel</button>
              <button onClick={handleSubmit} style={{ background: "#008751", border: "none", borderRadius: 8, padding: "10px 24px", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>
                {editUser ? "💾 Save Changes" : "✅ Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {showDeleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#ffffff", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 16, padding: 28, maxWidth: 380, textAlign: "center", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Delete User?</div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20, fontWeight: 500 }}>This action cannot be undone. The user will lose all system access immediately.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setShowDeleteConfirm(null)} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 20px", color: "#64748b", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>Cancel</button>
              <button onClick={() => { setUsers(prev => prev.filter(u => u.id !== showDeleteConfirm)); setShowDeleteConfirm(null); }} style={{ background: "#dc2626", border: "none", borderRadius: 8, padding: "10px 20px", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>Delete User</button>
            </div>
          </div>
        </div>
      )}

      {/* ── USER DETAIL PANEL ── */}
      {activeDetailUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)", zIndex: 2000, display: "flex", justifyContent: "flex-end" }} onClick={() => setActiveDetailUser(null)}>
          <div style={{ width: 380, background: "#ffffff", borderLeft: "1px solid rgba(0,0,0,0.06)", height: "100%", overflowY: "auto", padding: 28, boxShadow: "-10px 0 15px -3px rgba(0,0,0,0.05)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", fontFamily: "'Syne', sans-serif" }}>User Profile</div>
              <button onClick={() => setActiveDetailUser(null)} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, width: 34, height: 34, color: "#64748b", fontSize: 18, cursor: "pointer", fontWeight: 700 }}>×</button>
            </div>
            {(() => {
              const u = activeDetailUser;
              const role = ROLES[u.role];
              return (
                <>
                  <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: role.bg, border: `2px solid ${role.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 12px" }}>{role.icon}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{u.name}</div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, fontWeight: 500 }}>{u.email}</div>
                    <div style={{ marginTop: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 14px", borderRadius: 20, background: role.bg, color: role.color, border: `1px solid ${role.border}` }}>{role.label}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                    {[["Department", u.dept], ["Phone", u.phone || "—"], ["Status", u.status], ["Last Login", u.lastLogin], ["Account Created", u.created]].map(([l, v]) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#f8fafc", borderRadius: 8, border: "1px solid rgba(0,0,0,0.03)" }}>
                        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{l}</span>
                        <span style={{ fontSize: 12, color: "#0f172a", fontWeight: 700 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>Granted Permissions</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {role.permissions.map(p => (
                        <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#475569", fontWeight: 500 }}>
                          <span style={{ color: "#008751" }}>✓</span> {PERMISSION_LABELS[p] || p}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setActiveDetailUser(null); openEdit(u); }} style={{ flex: 1, background: "#008751", border: "none", borderRadius: 8, padding: "12px 0", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>Edit User</button>
                    <button onClick={() => setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: x.status === "Active" ? "Inactive" : "Active" } : x))}
                      style={{ flex: 1, background: u.status === "Active" ? "#fef2f2" : "#d1fae5", border: `1px solid ${u.status === "Active" ? "#fecaca" : "#a7f3d0"}`, borderRadius: 8, padding: "12px 0", color: u.status === "Active" ? "#dc2626" : "#059669", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>
                      {u.status === "Active" ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── MAIN APP ────────────────────────────────────────────────────────────────

const API_URL = "http://localhost:3001";

export default function ACETELDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [time, setTime] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);

  // --- STATEFUL DATA ---
  const [students, setStudents] = useState(recentStudents);
  const [applications, setApplications] = useState(mockApplications);
  const [alumni, setAlumni] = useState(mockAlumni);
  const [supervisors, setSupervisors] = useState([]);
  const [facilitators, setFacilitators] = useState([]);
  const [shortCourses, setShortCourses] = useState([]);
  const [academicEvents, setAcademicEvents] = useState([]);
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [auditLogs, setAuditLogs] = useState([{ id: 1, timestamp: new Date().toISOString(), action: "SYSTEM_INIT", targetId: "System", targetName: "All System Records", reason: "System initialized", officer: "System Admin" }]);
  const [recycleBin, setRecycleBin] = useState([]);
  const [nationalities, setNationalities] = useState(initialNationalities);
  const [semesterDistribution, setSemesterDistribution] = useState(initialSemesterDistribution);

  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newCourseForm, setNewCourseForm] = useState({ title: "", description: "", duration: "", facilitatorName: "", startDate: "" });
  const [newEventForm, setNewEventForm] = useState({ name: "", type: "Workshop", date: "", location: "", speaker: "", description: "" });
  const [newStudentForm, setNewStudentForm] = useState({ name: "", matric: "", prog: "MSc Artificial Intelligence", email: "", instEmail: "", phone: "", gender: "Male" });
  const [studentProgFilter, setStudentProgFilter] = useState("All Programmes");

  // --- EXPORT STATES ---
  const [exportConfig, setExportConfig] = useState({
    target: "registry", // registry | admissions | facilitators | ecosystem | audit
    format: "pdf",
    prog: "All Programmes",
    session: "All Sessions",
    semester: "All Semesters",
  });
  const [showExportModal, setShowExportModal] = useState(false);

  // --- DERIVED METRICS ---
  const [metrics, setMetrics] = useState({
    atRiskCount: 0,
    completionRate: 0,
    growthData: [],
    performanceData: [],
    funnelData: [
      { name: "Applied", value: 0, fill: "#3b82f6" },
      { name: "Shortlisted", value: 0, fill: "#6366f1" },
      { name: "Admitted", value: 0, fill: "#8b5cf6" },
      { name: "Enrolled", value: 0, fill: "#a78bfa" },
      { name: "Graduated", value: 0, fill: "#c4b5fd" },
    ],
    semesterData: initialSemesterDistribution
  });

  useEffect(() => {
    // Recalculate metrics whenever data changes
    const mscCount = students.filter(s => s.prog.includes("MSc")).length;
    const phdCount = students.filter(s => s.prog.includes("PhD")).length;
    const graduatedCount = alumni.length;
    
    // Simple semester dist
    const dist = initialSemesterDistribution.map(d => ({
      ...d,
      count: students.filter(s => `Sem ${s.sem}` === d.semester || (d.semester === "Sem 8+" && s.sem >= 8)).length
    }));

    // Funnel Update
    const funnel = [
      { name: "Applied", value: applications.length, fill: "#3b82f6" },
      { name: "Shortlisted", value: Math.floor(applications.length * 0.8), fill: "#6366f1" },
      { name: "Admitted", value: applications.filter(a => a.status === "Admitted").length, fill: "#8b5cf6" },
      { name: "Enrolled", value: students.length, fill: "#a78bfa" },
      { name: "Graduated", value: alumni.length, fill: "#c4b5fd" },
    ];

    setMetrics(prev => ({
      ...prev,
      atRiskCount: students.filter(s => {
        const limit = s.prog.includes("PhD") ? 12 : 6;
        const remaining = limit - s.sem;
        return remaining <= 1 || s.status === "Inactive";
      }).length,
      completionRate: students.length > 0 ? Math.round((alumni.length / (students.length + alumni.length)) * 100) : 0,
      semesterData: dist,
      funnelData: funnel,
      performanceData: PROGRAMMES.map(p => ({
        program: p.replace("Artificial Intelligence", "AI").replace("Management Information System", "MIS"),
        msc: p.startsWith("MSc") ? students.filter(s => s.prog === p).length : 0,
        phd: p.startsWith("PhD") ? students.filter(s => s.prog === p).length : 0,
        admitted: applications.filter(a => a.prog === p && a.status === "Admitted").length,
        graduated: alumni.filter(a => a.prog === p).length
      }))
    }));
  }, [students, applications, alumni]);

  const [deleteData, setDeleteData] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");

  const [editData, setEditData] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editReason, setEditReason] = useState("");

  const [restoreData, setRestoreData] = useState(null);
  const [restoreReason, setRestoreReason] = useState("");

  const [studentHistoryData, setStudentHistoryData] = useState(null);

  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showBinModal, setShowBinModal] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  useEffect(() => {
    if (editData) setEditForm({ ...editData });
  }, [editData]);

  const handleDeleteSubmit = () => {
    if (!deleteReason.trim()) return alert("Reason is required to delete.");
    
    // Determine type for correct restoration
    let type = "student";
    const targetId = deleteData._id || deleteData.id;
    if (applications.some(a => (a._id || a.id) === targetId)) type = "application";
    else if (shortCourses.some(c => (c._id || c.id) === targetId)) type = "course";
    else if (academicEvents.some(e => (e._id || e.id) === targetId)) type = "event";
    else if (supervisors.some(su => (su._id || su.id) === targetId)) type = "supervisor";
    else if (facilitators.some(fa => (fa._id || fa.id) === targetId)) type = "facilitator";

    // add to bin with type
    setRecycleBin(prev => [{ ...deleteData, _deletedAt: new Date().toISOString(), _reason: deleteReason, _officer: "Admin", _type: type }, ...prev]);
    
    // remove from students or applications or ecosystem items or staff
    setStudents(prev => prev.filter(s => (s._id || s.id) !== targetId));
    setApplications(prev => prev.filter(a => (a._id || a.id) !== targetId));
    setShortCourses(prev => prev.filter(c => (c._id || c.id) !== targetId));
    setAcademicEvents(prev => prev.filter(e => (e._id || e.id) !== targetId));
    setSupervisors(prev => prev.filter(su => (su._id || su.id) !== targetId));
    setFacilitators(prev => prev.filter(fa => (fa._id || fa.id) !== targetId));
    
    // add to audit logs
    const itemName = deleteData.title || deleteData.name || "Unknown Item";
    setAuditLogs(prev => [{ id: Date.now(), timestamp: new Date().toISOString(), action: "DELETE", targetId, targetName: itemName, reason: deleteReason, officer: "Admin" }, ...prev]);
    
    setDeleteData(null);
    setDeleteReason("");
  };

  const handleEditSubmit = () => {
    if (!editReason.trim()) return alert("Reason is required to edit.");
    
    const targetId = editData._id || editData.id;

    // update student, application, or ecosystem items, or staff
    setStudents(prev => prev.map(s => (s._id || s.id) === targetId ? { ...editForm } : s));
    setApplications(prev => prev.map(a => (a._id || a.id) === targetId ? { ...editForm } : a));
    setShortCourses(prev => prev.map(c => (c._id || c.id) === targetId ? { ...editForm } : c));
    setAcademicEvents(prev => prev.map(e => (e._id || e.id) === targetId ? { ...editForm } : e));
    setSupervisors(prev => prev.map(su => (su._id || su.id) === targetId ? { ...editForm } : su));
    setFacilitators(prev => prev.map(fa => (fa._id || fa.id) === targetId ? { ...editForm } : fa));
    
    // add to audit logs
    const itemName = editData.title || editData.name || "Unknown Item";
    setAuditLogs(prev => [{ id: Date.now(), timestamp: new Date().toISOString(), action: "EDIT", targetId, targetName: itemName, reason: editReason, officer: "Admin" }, ...prev]);
    
    setEditData(null);
    setEditForm(null);
    setEditReason("");
  };

  const handleRestoreSubmit = () => {
    if (!restoreReason.trim()) return alert("Reason is required to restore.");
    
    const { _deletedAt, _reason, _officer, _type, ...rest } = restoreData;
    
    // Correct restoration based on type
    if (_type === "application") setApplications(prev => [rest, ...prev]);
    else if (_type === "course") setShortCourses(prev => [rest, ...prev]);
    else if (_type === "event") setAcademicEvents(prev => [rest, ...prev]);
    else if (_type === "supervisor") setSupervisors(prev => [rest, ...prev]);
    else if (_type === "facilitator") setFacilitators(prev => [rest, ...prev]);
    else setStudents(prev => [rest, ...prev]);

    setRecycleBin(prev => prev.filter(s => (s._id || s.id) !== (rest._id || rest.id)));
    setAuditLogs(prev => [{ id: Date.now(), timestamp: new Date().toISOString(), action: "RESTORE", targetId: rest._id || rest.id, targetName: rest.name || rest.title, reason: restoreReason, officer: "Admin" }, ...prev]);
    
    setRestoreData(null);
    setRestoreReason("");
  };

  const handleAddStudent = () => {
    if (!newStudentForm.name || !newStudentForm.matric) return alert("Name and Matric Number are required.");
    
    const newStudent = {
      id: newStudentForm.matric,
      name: newStudentForm.name,
      prog: newStudentForm.prog,
      sem: 1,
      remaining: newStudentForm.prog.includes("PhD") ? 12 : 6,
      supervisor: "Unassigned",
      gender: newStudentForm.gender,
      email: newStudentForm.email || "",
      instEmail: newStudentForm.instEmail || "",
      phone: newStudentForm.phone || "",
      entry: ACETEL_SESSIONS[0],
      gradYear: new Date().getFullYear() + (newStudentForm.prog.includes("PhD") ? 6 : 3),
      status: "Active"
    };

    setStudents(prev => [newStudent, ...prev]);
    setShowAddStudentModal(false);
    setNewStudentForm({ name: "", matric: "", prog: "MSc Artificial Intelligence", email: "", instEmail: "", phone: "", gender: "Male" });
    setAuditLogs(prev => [{ id: Date.now(), timestamp: new Date().toISOString(), action: "ADD", targetId: newStudent.id, targetName: newStudent.name, reason: "Manual Registration", officer: "Admin" }, ...prev]);
  };

  const handleAddCourse = async () => {
    if (!newCourseForm.title) return alert("Course title is required.");
    try {
      const resp = await fetch(`${API_URL}/api/short-courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newCourseForm, students: [], studentsCount: 0, status: "Active" }),
      });
      const data = await resp.json();
      setShortCourses(prev => [...prev, data]);
      setShowAddCourseModal(false);
      setNewCourseForm({ title: "", description: "", duration: "", facilitatorName: "", startDate: "" });
    } catch (err) { alert("Error adding course."); }
  };

  const handleAddEvent = async () => {
    if (!newEventForm.name) return alert("Event name/title is required.");
    try {
      const resp = await fetch(`${API_URL}/api/academic-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newEventForm, attendance: [] }),
      });
      const data = await resp.json();
      setAcademicEvents(prev => [...prev, data]);
      setShowAddEventModal(false);
      setNewEventForm({ name: "", type: "Workshop", date: "", location: "", speaker: "", description: "" });
    } catch (err) { alert("Error adding event."); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = file.name.toLowerCase();

    try {
      const XLSX = await import("xlsx");
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (data.length > 0) {
           let listType = "Registry";
           if (fileName.includes("admission") || fileName.includes("applicant")) listType = "Admissions";
           else if (fileName.includes("alumni") || fileName.includes("graduat")) listType = "Alumni";
           else if (fileName.includes("supervisor")) listType = "Supervisors";
           else if (fileName.includes("facilitator")) listType = "Facilitators";
           else if (fileName.includes("course") || fileName.includes("short")) listType = "ShortCourses";
           else if (fileName.includes("workshop") || fileName.includes("conference") || fileName.includes("event")) listType = "Events";

           if (listType === "Registry") {
             const newStudents = data.map((row) => {
               const fName = row["First Name"] || row["Names"] || row["Other Names"] || "";
               const sName = row["Surname"] || row["Last Name"] || "";
               const fullName = row["Full Name"] || row["Name"] || `${sName} ${fName}`.trim() || "Unknown";
               const prog = row["Programme"] || row["Program"] || "MSc Artificial Intelligence";
               const sem = parseInt(row["Semester"]) || 1;
               const limit = prog.includes("PhD") ? 12 : 6;
               return {
                 id: row["Matric Number"] || row["ID"] || `ACE/${new Date().getFullYear()}/${Math.floor(Math.random()*10000)}`,
                 name: fullName,
                 prog,
                 sem,
                 remaining: Math.max(0, limit - sem),
                 gender: row["Gender"] || row["Sex"] || "N/A",
                 gradYear: parseInt(row["Grad Year"]) || new Date().getFullYear() + 2,
                 status: row["Status"] || "Active"
               };
             });
             setStudents(prev => [...newStudents, ...prev]);
             alert(`Imported ${newStudents.length} students to Registry.`);
           } else if (listType === "Admissions") {
             const newApps = data.map((row) => ({
               name: row["Name"] || row["Applicant Name"] || "Unknown",
               prog: row["Programme"] || row["Program"] || "MSc Artificial Intelligence",
               degree: row["Previous Degree"] || "BSc",
               cgpa: row["CGPA"] || "0.0",
               nat: row["Nationality"] || "Unknown",
               date: row["Date Applied"] || new Date().toLocaleDateString(),
               status: row["Status"] || "Pending"
             }));
             setApplications(prev => [...newApps, ...prev]);
             alert(`Imported ${newApps.length} applicants.`);
           } else if (listType === "Alumni") {
             const newAlumni = data.map((row) => ({
               id: row["Matric Number"] || row["ID"] || "N/A",
               name: row["Name"] || "Unknown",
               prog: row["Programme"] || "N/A",
               gradYear: parseInt(row["Grad Year"]) || 2024,
               employer: row["Employer"] || "N/A",
               role: row["Job Role"] || "N/A",
               location: row["Location"] || "N/A",
               engagement: "Medium"
             }));
             setAlumni(prev => [...newAlumni, ...prev]);
             alert(`Imported ${newAlumni.length} alumni records.`);
           } else if (listType === "Supervisors") {
             const newSups = data.map(row => ({
               id: row["ID"] || Date.now() + Math.random(),
               name: row["Name"] || "Unknown",
               dept: row["Department"] || row["Discipline"] || "N/A",
               expertise: row["Expertise"] || "N/A",
               email: row["Email"] || "N/A",
               status: row["Status"] || "Active",
               current: 0,
               max: 10,
               load: 0
             }));
             setSupervisors(prev => [...newSups, ...prev]);
             alert(`Imported ${newSups.length} supervisors.`);
           } else if (listType === "Facilitators") {
             const newFacs = data.map(row => ({
               id: row["ID"] || Date.now() + Math.random(),
               name: row["Name"] || "Unknown",
               dept: row["Department"] || row["Discipline"] || "N/A",
               expertise: row["Expertise"] || "N/A",
               email: row["Email"] || "N/A"
             }));
             setFacilitators(prev => [...newFacs, ...prev]);
             alert(`Imported ${newFacs.length} facilitators.`);
           } else if (listType === "ShortCourses") {
             const newCourses = data.map(row => ({
               id: Date.now() + Math.random(),
               title: row["Title"] || row["Name"] || "Unknown",
               duration: row["Duration"] || "N/A",
               studentsCount: parseInt(row["Students"]) || 0,
               status: "Active"
             }));
             setShortCourses(prev => [...newCourses, ...prev]);
             alert(`Imported ${newCourses.length} short courses.`);
           } else if (listType === "Events") {
             const newEvents = data.map(row => ({
               id: Date.now() + Math.random(),
               type: row["Type"] || (fileName.includes("workshop") ? "Workshop" : "Conference"),
               name: row["Name"] || row["Title"] || "Unknown",
               date: row["Date"] || new Date().toISOString().split("T")[0],
               location: row["Location"] || "N/A"
             }));
             setAcademicEvents(prev => [...newEvents, ...prev]);
             alert(`Imported ${newEvents.length} events.`);
           }
        }
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      console.error(err);
      alert("Error parsing Excel file.");
    }
    e.target.value = "";
  };

  const handleExport = async (type) => {
    if (type === "administrative" || type === "administrative-pdf") {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      
      // Add Letterhead
      try {
        const img = new Image();
        img.src = "/images/letterhead.png";
        await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
        if (img.complete && img.naturalWidth > 0) {
          doc.addImage(img, 'PNG', 0, 0, 210, 40); // Standard A4 width is 210mm
        }
      } catch (err) {
        console.warn("Letterhead image not found, skipping...");
      }

      doc.setFontSize(18);
      doc.setTextColor(40);
      doc.text("Official Student Details Report", 105, 50, { align: "center" });
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 56, { align: "center" });

      const tableData = students.map(s => [
        s.name.split(" ")[0],
        s.name.split(" ").slice(1).join(" "),
        s.id,
        s.gender || "N/A",
        s.email || "N/A",
        s.instEmail || "N/A",
        s.phone || "N/A",
        s.prog,
        s.sem,
        s.status
      ]);

      autoTable(doc, {
        startY: 65,
        head: [["Surname", "Other Names", "Matric No", "Gender", "Personal Email", "Inst. Email", "Phone", "Prog", "Sem", "Status"]],
        body: tableData,
        theme: 'grid',
        headStyles: { fillStyle: '#1e3a8a', textColor: 255 },
        styles: { fontSize: 8 },
      });

      doc.save(`ACETEL_Official_Student_Details_${new Date().getFullYear()}.pdf`);
    } else if (type === "administrative-csv") {
      const headers = ["Surname", "Other Names", "Matric No", "Gender", "Personal Email", "Inst. Email", "Phone", "Prog", "Sem", "Status"];
      const rows = students.map(s => [
        `"${s.name.split(" ")[0]}"`,
        `"${s.name.split(" ").slice(1).join(" ")}"`,
        `"${s.id}"`,
        `"${s.gender || "N/A"}"`,
        `"${s.email || "N/A"}"`,
        `"${s.instEmail || "N/A"}"`,
        `"${s.phone || "N/A"}"`,
        `"${s.prog}"`,
        `"${s.sem}"`,
        `"${s.status}"`
      ]);
      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `ACETEL_Official_Student_Details_${new Date().getFullYear()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (type === "analytics" || type === "analytics-pdf") {
      // (Rich Analytics PDF code remains same as previous implementation)
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "portrait", format: "a4" });
      const W = 210; const now = new Date();
      const dateStr = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      const drawBar = (x, y, value, max, width, height, r, g, b) => {
        const filled = max > 0 ? Math.min((value / max) * width, width) : 0;
        doc.setFillColor(40, 52, 80); doc.rect(x, y, width, height, "F");
        doc.setFillColor(r, g, b); doc.rect(x, y, filled, height, "F");
      };
      doc.setFillColor(6, 12, 24); doc.rect(0, 0, W, 297, "F");
      doc.setFillColor(30, 58, 138); doc.rect(0, 0, W, 38, "F");
      doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont("helvetica", "bold");
      doc.text("ACETEL ANALYTICS REPORT", W / 2, 16, { align: "center" });
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text("African Centre of Excellence in Technology-Enhanced Learning", W / 2, 24, { align: "center" });
      doc.text(`Generated: ${dateStr}`, W / 2, 31, { align: "center" });
      const kpis = [
        { label: "Total Students", value: students.length, color: [59, 130, 246] },
        { label: "MSc Students", value: students.filter(s => s.prog?.includes("MSc")).length, color: [99, 102, 241] },
        { label: "PhD Students", value: students.filter(s => s.prog?.includes("PhD")).length, color: [139, 92, 246] },
        { label: "Applications", value: applications.length, color: [16, 185, 129] },
        { label: "Alumni", value: alumni.length, color: [245, 158, 11] },
        { label: "At-Risk Students", value: students.filter(s => s.remaining <= 1 || s.status === "Inactive").length, color: [239, 68, 68] },
      ];
      const cardW = 58, cardH = 28, cardGap = 8, startX = 16, startY = 46;
      kpis.forEach((k, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const x = startX + col * (cardW + cardGap); const y = startY + row * (cardH + cardGap);
        doc.setFillColor(20, 30, 55); doc.roundedRect(x, y, cardW, cardH, 3, 3, "F");
        doc.setDrawColor(k.color[0], k.color[1], k.color[2]); doc.setLineWidth(0.5);
        doc.roundedRect(x, y, cardW, cardH, 3, 3, "S");
        doc.setTextColor(k.color[0], k.color[1], k.color[2]); doc.setFontSize(20); doc.setFont("helvetica", "bold");
        doc.text(String(k.value), x + cardW / 2, y + 14, { align: "center" });
        doc.setTextColor(148, 163, 184); doc.setFontSize(8); doc.setFont("helvetica", "normal");
        doc.text(k.label, x + cardW / 2, y + 22, { align: "center" });
      });
      let curY = startY + 2 * (cardH + cardGap) + 14;
      doc.setTextColor(226, 232, 240); doc.setFontSize(12); doc.setFont("helvetica", "bold");
      doc.text("Student Distribution by Programme", 16, curY); curY += 7;
      const progData = (["MSc Cybersecurity", "MSc Artificial Intelligence", "MSc Management Information System", "PhD Cybersecurity", "PhD Artificial Intelligence", "PhD Management Information System"]).map(p => ({
        label: p.replace("Artificial Intelligence", "AI").replace("Management Information System", "MIS"),
        value: students.filter(s => s.prog === p).length,
      }));
      const maxProg = Math.max(...progData.map(d => d.value), 1);
      const barAreaW = W - 90;
      progData.forEach((p, i) => {
        const y = curY + i * 10; doc.setTextColor(148, 163, 184); doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
        doc.text(p.label, 16, y + 4); drawBar(85, y, p.value, maxProg, barAreaW, 6, 99, 102, 241);
        doc.setTextColor(99, 102, 241); doc.text(String(p.value), 85 + barAreaW + 3, y + 5);
      });
      curY += progData.length * 10 + 10;
      doc.setTextColor(226, 232, 240); doc.setFontSize(12); doc.setFont("helvetica", "bold");
      doc.text("Admissions Funnel", 16, curY); curY += 7;
      const funnelData = [
        { name: "Applied", value: applications.length, color: [59, 130, 246] },
        { name: "Shortlisted", value: Math.floor(applications.length * 0.8), color: [99, 102, 241] },
        { name: "Admitted", value: applications.filter(a => a.status === "Admitted").length, color: [139, 92, 246] },
        { name: "Enrolled", value: students.length, color: [167, 139, 250] },
      ];
      const maxFunnel = Math.max(...funnelData.map(d => d.value), 1);
      funnelData.forEach((f, i) => {
        const y = curY + i * 10; doc.setTextColor(148, 163, 184); doc.setFontSize(8);
        doc.text(f.name, 16, y + 4); drawBar(55, y, f.value, maxFunnel, barAreaW + 30, 6, f.color[0], f.color[1], f.color[2]);
        doc.setTextColor(f.color[0], f.color[1], f.color[2]); doc.text(String(f.value), 55 + barAreaW + 33, y + 5);
      });
      doc.addPage(); doc.setFillColor(6, 12, 24); doc.rect(0, 0, W, 297, "F");
      doc.setFillColor(30, 58, 138); doc.rect(0, 0, W, 14, "F");
      doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont("helvetica", "bold");
      doc.text("ACETEL ANALYTICS — STUDENT DETAIL", W / 2, 10, { align: "center" });
      autoTable(doc, {
        startY: 20,
        head: [["Name", "Programme", "Semester", "Status", "Supervisor"]],
        body: students.map(s => [s.name, s.prog, s.sem, s.status, s.supervisor || "Unassigned"]),
        theme: "grid",
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 8, fontStyle: "bold" },
        styles: { fontSize: 7.5, textColor: [148, 163, 184], fillColor: [15, 23, 42] },
        alternateRowStyles: { fillColor: [20, 30, 55] },
        tableLineColor: [40, 52, 80], tableLineWidth: 0.2,
      });
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p); doc.setFillColor(15, 23, 42); doc.rect(0, 289, W, 8, "F");
        doc.setTextColor(71, 85, 105); doc.setFontSize(7);
        doc.text(`ACETEL SDMS | Confidential | Page ${p} of ${totalPages}`, W / 2, 294, { align: "center" });
      }
      doc.save(`ACETEL_Analytics_Report_${now.toISOString().split("T")[0]}.pdf`);
    } else if (type === "analytics-csv") {
      const exportData = [
        { Metric: "Total Students", Value: students.length },
        { Metric: "MSc Students", Value: students.filter(s => s.prog.includes("MSc")).length },
        { Metric: "PhD Students", Value: students.filter(s => s.prog.includes("PhD")).length },
        { Metric: "Applications Received", Value: applications.length },
        { Metric: "Graduated Alumni", Value: alumni.length },
      ];
      const headers = ["Metric", "Value"];
      const rows = exportData.map(d => [`"${d.Metric}"`, d.Value]);
      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `ACETEL_Analytics_Summary_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleGranularExport = async () => {
    const { target, format, prog, session, semester } = exportConfig;
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    
    let exportData = [];
    let headers = [];
    let title = "";
    let fileName = "";

    if (target === "registry") {
      let filtered = [...students];
      if (prog !== "All Programmes") filtered = filtered.filter(s => s.prog === prog);
      if (session !== "All Sessions") filtered = filtered.filter(s => s.entry?.includes(session));
      if (semester !== "All Semesters") filtered = filtered.filter(s => String(s.sem) === semester);
      
      title = `${prog === "All Programmes" ? "Universal" : prog} Registry Report`;
      fileName = `ACETEL_Registry_${prog.replace(/ /g, "_")}`;
      headers = [["Surname", "Other Names", "Matric No", "Gender", "Email", "Prog", "Sem", "Status"]];
      exportData = filtered.map(s => [s.name.split(" ")[0], s.name.split(" ").slice(1).join(" "), s.id, s.gender || "N/A", s.email || "N/A", s.prog, s.sem, s.status]);
    } else if (target === "admissions") {
      let filtered = applications.filter(a => a.status === "Admitted");
      if (prog !== "All Programmes") filtered = filtered.filter(a => a.prog === prog);
      
      title = `Admitted Students Report (${prog})`;
      fileName = `ACETEL_Admissions_${prog.replace(/ /g, "_")}`;
      headers = [["Applicant Name", "Programme", "Prev Degree", "CGPA", "Nationality", "Date Applied"]];
      exportData = filtered.map(a => [a.name, a.prog, a.degree, a.cgpa, a.nat, a.date]);
    } else if (target === "graduated") {
      let filtered = students.filter(s => s.status === "Graduated");
      if (prog !== "All Programmes") filtered = filtered.filter(s => s.prog === prog);
      
      title = `Graduated Students Report (${prog})`;
      fileName = `ACETEL_Graduates_${prog.replace(/ /g, "_")}`;
      headers = [["Name", "Matric No", "Programme", "Grad Year", "Final CGPA", "Supervisor"]];
      exportData = filtered.map(s => [s.name, s.id, s.prog, s.gradYear, s.cgpa || "N/A", s.supervisor]);
    } else if (target === "alumni") {
      let filtered = [...alumni];
      if (prog !== "All Programmes") filtered = filtered.filter(a => a.prog === prog);
      
      title = `Official Alumni Directory (${prog})`;
      fileName = `ACETEL_Alumni_${prog.replace(/ /g, "_")}`;
      headers = [["Name", "Matric No", "Programme", "Grad Year", "Employer", "Role", "Location"]];
      exportData = filtered.map(a => [a.name, a.id, a.prog, a.gradYear, a.employer, a.role, a.location]);
    } else if (target === "facilitators") {
      let filtered = [...facilitators];
      title = "Official Facilitator Directory";
      fileName = `ACETEL_Facilitators`;
      headers = [["Name", "Department", "Expertise", "Email", "Phone", "Office"]];
      exportData = filtered.map(f => [f.name, f.dept, f.expertise, f.email, f.phone || "N/A", f.office || "N/A"]);
    } else if (target === "ecosystem") {
      title = "Short Courses & Academic Events Summary";
      fileName = `ACETEL_Ecosystem`;
      headers = [["Category", "Title", "In-Charge", "Schedule", "Metrics"]];
      const courses = shortCourses.map(c => ["Short Course", c.title, c.facilitatorName || "N/A", c.startDate || "N/A", `${c.studentsCount} Students`]);
      const events = academicEvents.map(e => [e.type, e.name, e.speaker || "N/A", e.date, `${e.attendance?.length || 0} Attendees`]);
      exportData = [...courses, ...events];
    } else if (target === "audit") {
      title = "System Audit Trail & Security Logs";
      fileName = `ACETEL_AuditTrail`;
      headers = [["Timestamp", "Action", "Target", "Reason", "Officer"]];
      exportData = auditLogs.map(l => [new Date(l.timestamp).toLocaleString(), l.action, l.targetName, l.reason, l.officer]);
    }

    if (format === "csv") {
      const csvContent = [headers[0].join(","), ...exportData.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
      link.click();
    } else {
      const doc = new jsPDF();
      doc.setFillColor(30, 58, 138); doc.rect(0, 0, 210, 40, "F");
      doc.setTextColor(255); doc.setFontSize(22); doc.setFont("helvetica", "bold");
      doc.text("ACETEL", 15, 20);
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text("Africa Centre of Excellence on Technology Enhanced Learning", 15, 28);
      doc.text("National Open University of Nigeria", 15, 33);
      doc.setFillColor(0, 135, 81); doc.rect(0, 40, 210, 2, "F");

      doc.setTextColor(40); doc.setFontSize(16);
      doc.text(title.toUpperCase(), 105, 55, { align: "center" });
      doc.setFontSize(9); doc.setTextColor(100);
      doc.text(`Filters: ${prog} | Session: ${session} | Semester: ${semester}`, 105, 61, { align: "center" });
      doc.text(`Official System Generated Document | ${new Date().toLocaleString()}`, 105, 66, { align: "center" });

      autoTable(doc, {
        startY: 75,
        head: headers,
        body: exportData,
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2, font: "helvetica" },
        alternateRowStyles: { fillColor: [245, 247, 250] }
      });

      doc.save(`${fileName}_${new Date().toISOString().split('T')[0]}.pdf`);
    }
    setShowExportModal(false);
  };

  const handleAuditExport = async (format) => {
    if (format === 'pdf') {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("System Audit Trail Report", 105, 15, { align: "center" });
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 22, { align: "center" });

      const tableData = auditLogs.map(l => [
        new Date(l.timestamp).toLocaleString(),
        l.action,
        `${l.targetName} (${l.targetId})`,
        l.reason,
        l.officer
      ]);

      autoTable(doc, {
        startY: 30,
        head: [["Timestamp", "Action", "Target", "Reason", "Officer"]],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241], textColor: 255 },
      });
      doc.save(`ACETEL_Audit_Trail_${new Date().toISOString().split('T')[0]}.pdf`);
    } else {
      const headers = ["Timestamp", "Action", "Target", "Reason", "Officer"];
      const rows = auditLogs.map(l => [
        `"${new Date(l.timestamp).toLocaleString()}"`,
        `"${l.action}"`,
        `"${l.targetName} (${l.targetId})"`,
        `"${l.reason.replace(/"/g, '""')}"`,
        `"${l.officer}"`
      ]);
      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `ACETEL_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Fetch ecosystem data and staff from the backend on mount
  useEffect(() => {
    // 1. Fetch Events
    fetch(`${API_URL}/api/academic-events`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAcademicEvents(data.map(e => ({
            id: e._id,
            type: e.type,
            name: e.name,
            date: e.date ? new Date(e.date).toISOString().split("T")[0] : "TBD",
            location: e.location,
            description: e.description || "",
            attendance: e.attendance || [],
          })));
        }
      })
      .catch(() => {}); // silently fail — user can still upload via Excel

    fetch(`${API_URL}/api/short-courses`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setShortCourses(data.map(c => ({
            id: c._id,
            title: c.name || c.title || "Untitled Course",
            duration: c.duration || "N/A",
            studentsCount: c.studentsCount || 0,
            status: c.status || "Active",
            students: c.students || [],
          })));
        }
      })
      .catch(() => {});

    // 3. Fetch Supervisors & Facilitators
    fetch(`${API_URL}/api/facilitators/all`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          const mapped = data.map(f => {
            const current = Math.floor(Math.random() * 5); // Mocked for now, or could count from students
            const max = 10;
            return {
              id: f._id,
              name: f.name,
              dept: f.programmes?.[0] || "ACETEL",
              expertise: f.programmes?.join(", ") || "General",
              email: f.email,
              status: f.status || "Active",
              phone: "+234 000 000 0000",
              current: current,
              max: max,
              load: (current / max) * 100
            };
          });
          setFacilitators(mapped);
          setSupervisors(mapped); // Using same list for now as per system logic
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Callback: append uploaded students to a specific course in state
  const handleCourseStudentsUploaded = (course, newStudents) => {
    setShortCourses(prev => prev.map(c =>
      (c.id === course.id || c.title === course.title)
        ? { ...c, students: [...(c.students || []), ...newStudents], studentsCount: (c.studentsCount || 0) + newStudents.length }
        : c
    ));
  };

  // Callback: append uploaded attendees to a specific event in state
  const handleEventAttendanceUploaded = (event, newAttendees) => {
    setAcademicEvents(prev => prev.map(e =>
      (e.id === event.id || e.name === event.name)
        ? { ...e, attendance: [...(e.attendance || []), ...newAttendees] }
        : e
    ));
  };

  const handleMessage = (recipient) => {
    const defaultMsg = recipient?.name ? `Hello ${recipient.name}, ` : "";
    const msg = prompt(`Send a message to ${recipient?.name || 'Network'}:`, defaultMsg);
    if (msg) {
      alert(`Message successfully sent to ${recipient?.name || 'Network'}.`);
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case "overview": return <OverviewTab data={{ students, applications, supervisors, metrics }} setActiveTab={setActiveTab} />;
      case "students": return <StudentsTab data={{ students, applications }} onEdit={(item, type) => setEditData({ ...item, _editType: type })} onDelete={setDeleteData} onHistory={setStudentHistoryData} onAddStudent={() => setShowAddStudentModal(true)} progFilter={studentProgFilter} setProgFilter={setStudentProgFilter} setActiveTab={setActiveTab} />;
      case "alumni": return <AlumniTab data={{ alumni }} onEdit={(item, type) => setEditData({ ...item, _editType: type })} onDelete={setDeleteData} onHistory={setStudentHistoryData} onMessage={handleMessage} />;
      case "admissions": return <AdmissionsTab data={{ applications, metrics }} onEdit={(item, type) => setEditData({ ...item, _editType: type })} onDelete={setDeleteData} onHistory={setStudentHistoryData} />;
      case "supervisors": return <SupervisorsTab data={{ supervisors }} onEdit={(item, type) => setEditData({ ...item, _editType: type })} onDelete={setDeleteData} onHistory={setStudentHistoryData} />;
      case "facilitators": return <FacilitatorsTab data={{ facilitators }} onEdit={(item, type) => setEditData({ ...item, _editType: type })} onDelete={setDeleteData} onHistory={setStudentHistoryData} />;
      case "ecosystem": return <EcosystemTab data={{ shortCourses, academicEvents }} onCourseStudentsUploaded={handleCourseStudentsUploaded} onEventAttendanceUploaded={handleEventAttendanceUploaded} onAddCourse={() => setShowAddCourseModal(true)} onAddEvent={() => setShowAddEventModal(true)} onEdit={(item, type) => setEditData({ ...item, _editType: type })} onDelete={setDeleteData} />;
      case "ai": return <AITab data={{ students, metrics }} />;
      case "recruitment": return <RecruitmentTab data={{ nationalities }} />;
      case "users": return <UserManagementTab />;
      default: return <OverviewTab data={{ students, applications, supervisors, metrics }} />;
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f0fdf4",
      fontFamily: "'DM Sans', system-ui, sans-serif",
      color: "#1e293b",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Space+Mono:wght@400;700&family=DM+Sans:wght@400;500;600&display=swap');
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Sidebar */}
      <div style={{
        position: "fixed", left: 0, top: 0, bottom: 0, width: 220,
        background: "#ebfdf0", borderRight: "1px solid rgba(0,100,0,0.08)",
        display: "flex", flexDirection: "column", zIndex: 100,
        boxShadow: "4px 0 20px rgba(0,0,0,0.05)",
      }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", overflowX: "hidden" }} className="custom-scrollbar">
          {/* Branding Section */}
          <div style={{ padding: "32px 20px 20px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
            <div style={{ background: "#ffffff", padding: 8, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
              <img src="https://acetel.nou.edu.ng/wp-content/uploads/2022/12/logo.png" alt="ACETEL" style={{ height: 44, width: "auto", objectFit: "contain" }} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#008751", letterSpacing: 0.5, fontFamily: "'Syne', sans-serif" }}>ACETEL</div>
              <div style={{ fontSize: 9, color: "rgba(0,135,81,0.6)", fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>Ecosystem</div>
            </div>
          </div>
          <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 9, color: "rgba(0,135,81,0.5)", fontWeight: 800, padding: "0 12px 10px", letterSpacing: 1.2, textTransform: "uppercase" }}>Administrative Menu</div>
          {NAV_TABS.map(tab => (
            <div key={tab.id}>
              {tab.adminOnly && <div style={{ height: 1, background: "rgba(0,135,81,0.1)", margin: "12px 12px 12px" }} />}
              <button onClick={() => setActiveTab(tab.id)} style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "11px 12px", borderRadius: 10, border: "none",
                background: activeTab === tab.id ? "#008751" : "transparent",
                color: activeTab === tab.id ? "#ffffff" : (tab.adminOnly ? "#ef4444" : "#475569"),
                cursor: "pointer", textAlign: "left", fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500,
                transition: "all 0.2s ease",
              }}>
                <span style={{ fontSize: 16, filter: activeTab === tab.id ? "brightness(1.5)" : "grayscale(0.5) opacity(0.8)" }}>{tab.icon}</span>
                <span style={{ flex: 1 }}>{tab.label}</span>
                {tab.adminOnly && <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 6, background: "rgba(239,68,68,0.2)", color: "#fca5a5", fontWeight: 800 }}>ADMIN</span>}
              </button>
            </div>
          ))}

          {/* System Tools - Fully Visible */}
          <div style={{ marginTop: 24, padding: "0 12px" }}>
            <div style={{ fontSize: 9, color: "rgba(0,135,81,0.5)", fontWeight: 800, padding: "0 0 10px", letterSpacing: 1.2, textTransform: "uppercase" }}>System Tools</div>
            
            <div style={{ 
              display: "flex", flexDirection: "column", gap: 6,
              background: "rgba(0,135,81,0.03)", borderRadius: 12, padding: 8,
              border: "1px solid rgba(0,135,81,0.1)"
            }}>
              <button onClick={() => setShowAuditModal(true)} style={{ background: "none", border: "none", padding: "8px 12px", color: "#1e3a8a", fontSize: 12, cursor: "pointer", textAlign: "left", display: "flex", gap: 8, alignItems: "center", borderRadius: 6, fontWeight: 700 }} onMouseEnter={e => e.currentTarget.style.background="rgba(0,135,81,0.05)"} onMouseLeave={e => e.currentTarget.style.background="none"}><span>👁️</span> Audit Trail</button>
              <button onClick={() => setShowBinModal(true)} style={{ background: "none", border: "none", padding: "8px 12px", color: "#dc2626", fontSize: 12, cursor: "pointer", textAlign: "left", display: "flex", gap: 8, alignItems: "center", borderRadius: 6, fontWeight: 700 }} onMouseEnter={e => e.currentTarget.style.background="rgba(239,68,68,0.05)"} onMouseLeave={e => e.currentTarget.style.background="none"}><span>🗑️</span> Recycle Bin</button>
              
              <div style={{ padding: "8px 12px 2px", fontSize: 9, color: "rgba(0,135,81,0.5)", fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase" }}>Reports</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: "4px 4px" }}>
                {[
                  { id: "registry", label: "Registry", color: "#3b82f6" },
                  { id: "admissions", label: "Admissions", color: "#10b981" },
                  { id: "graduated", label: "Graduated", color: "#008751" },
                  { id: "alumni", label: "Alumni", color: "#8b5cf6" },
                ].map(item => (
                  <button 
                    key={item.id}
                    onClick={() => { setExportConfig({ ...exportConfig, target: item.id }); setShowExportModal(true); }}
                    style={{ 
                      background: "#ffffff", border: "1px solid rgba(0,135,81,0.1)", 
                      borderRadius: 8, padding: "8px 6px", color: "#008751", fontSize: 10, fontWeight: 700, 
                      cursor: "pointer", textAlign: "center", transition: "all 0.2s" 
                    }}
                    onMouseEnter={e => {e.currentTarget.style.background="#f0fdf4"; e.currentTarget.style.borderColor="#008751";}}
                    onMouseLeave={e => {e.currentTarget.style.background="#ffffff"; e.currentTarget.style.borderColor="rgba(0,135,81,0.1)";}}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => document.getElementById("global-excel-upload")?.click()} 
                style={{ background: "#008751", border: "none", padding: "10px 12px", color: "#ffffff", fontSize: 12, cursor: "pointer", textAlign: "center", display: "flex", gap: 8, alignItems: "center", justifyContent: "center", borderRadius: 8, fontWeight: 700, marginTop: 8 }} 
                onMouseEnter={e => e.currentTarget.style.opacity="0.9"} 
                onMouseLeave={e => e.currentTarget.style.opacity="1"}>
                <span>📥</span> Global Upload
              </button>
              
              <div style={{ padding: "8px 12px", borderTop: "1px solid rgba(0,135,81,0.1)", marginTop: 4 }}>
                <div style={{ fontSize: 10, color: "#008751", background: "rgba(0,135,81,0.05)", border: "1px solid rgba(0,135,81,0.1)", padding: "4px 10px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 800 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#008751", boxShadow: "0 0 8px rgba(0,135,81,0.4)" }} />
                  AI ACTIVE
                </div>
              </div>
            </div>
          </div>
        </nav>
      </div>
        
      {/* User */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(0,135,81,0.1)", background: "rgba(0,135,81,0.05)", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #008751, #166534)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 700 }}>A</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>Admin</div>
            <div style={{ fontSize: 10, color: "rgba(0,135,81,0.6)", fontWeight: 500 }}>System Specialist</div>
          </div>
        </div>
      </div>
    </div>

      {/* Main */}
      <div key={refreshKey} style={{ marginLeft: 220 }}>
        <input 
          type="file" 
          id="global-excel-upload" 
          style={{ display: "none" }} 
          accept=".xlsx, .xls, .csv" 
          onChange={handleFileUpload} 
        />
        {/* Top Bar */}
        <div style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "#ffffff",
          borderBottom: "1px solid rgba(30,58,138,0.1)",
          padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01)"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", maxWidth: 1280, margin: "0 auto" }}>
            <img src="https://nou.edu.ng/wp-content/uploads/2021/12/Logo-1.png" alt="NOUN" style={{ height: 48, objectFit: "contain" }} />
            
            <div style={{ textAlign: "center", flex: 1, padding: "0 40px" }}>
              <div style={{ 
                fontSize: 22, 
                fontWeight: 900, 
                fontFamily: "'Syne', sans-serif", 
                letterSpacing: "0.02em",
                margin: 0,
                lineHeight: 1
              }}>
                <div style={{ color: "#008751", fontSize: 14 }}>Africa Centre of Excellence on Technology Enhanced Learning</div>
                <div style={{ color: "#1e3a8a", fontSize: 18 }}>Student Database Management System</div>
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
                <span style={{ color: "#008751", background: "rgba(0,135,81,0.08)", padding: "2px 10px", borderRadius: 4 }}>{NAV_TABS.find(t => t.id === activeTab)?.label}</span>
                <span style={{ color: "#cbd5e1" }}>|</span>
                <span>{time.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}</span>
                <span style={{ color: "#cbd5e1" }}>|</span>
                <span style={{ color: "#1e3a8a", fontFamily: "'Space Mono', monospace" }}>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
            </div>

            <img src="https://acetel.nou.edu.ng/wp-content/uploads/2022/12/logo.png" alt="ACETEL" style={{ height: 48, objectFit: "contain" }} />
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "28px 32px" }}>
          {renderTab()}
        </div>

        {/* MODALS */}
        {deleteData && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#ffffff", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 16, padding: 28, maxWidth: 400, width: "100%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#1e3a8a", marginBottom: 12, fontFamily: "'Syne', sans-serif" }}>🗑️ Delete Record</div>
              <div style={{ fontSize: 13, color: "#475569", marginBottom: 20, fontWeight: 500, lineHeight: 1.5 }}>You are about to move <b>{deleteData.name || deleteData.title}</b> to the Recycle Bin. Please provide a mandatory reason for the audit trail.</div>
              <textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)} placeholder="Reason for deletion..." rows={3} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", color: "#1e293b", fontSize: 13, outline: "none", marginBottom: 20, resize: "none", fontWeight: 500 }} />
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => {setDeleteData(null); setDeleteReason("");}} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 20px", color: "#64748b", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>Cancel</button>
                <button onClick={handleDeleteSubmit} style={{ background: "#dc2626", border: "none", borderRadius: 8, padding: "10px 20px", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>Move to Bin</button>
              </div>
            </div>
          </div>
        )}

        {restoreData && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 2100, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#ffffff", border: "1px solid rgba(0,135,81,0.2)", borderRadius: 16, padding: 28, maxWidth: 400, width: "100%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#008751", marginBottom: 12, fontFamily: "'Syne', sans-serif" }}>♻️ Restore Record</div>
              <div style={{ fontSize: 13, color: "#475569", marginBottom: 20, fontWeight: 500, lineHeight: 1.5 }}>You are about to restore <b>{restoreData.name || restoreData.title}</b> from the Recycle Bin. Please provide a mandatory reason.</div>
              <textarea value={restoreReason} onChange={e => setRestoreReason(e.target.value)} placeholder="Reason for restoration..." rows={3} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", color: "#1e293b", fontSize: 13, outline: "none", marginBottom: 20, resize: "none", fontWeight: 500 }} />
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => {setRestoreData(null); setRestoreReason("");}} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 20px", color: "#64748b", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>Cancel</button>
                <button onClick={handleRestoreSubmit} style={{ background: "#008751", border: "none", borderRadius: 8, padding: "10px 20px", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>Restore Record</button>
              </div>
            </div>
          </div>
        )}

        {editData && editForm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 28, maxWidth: 500, width: "100%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#1e3a8a", marginBottom: 12, fontFamily: "'Syne', sans-serif" }}>📝 Edit Record</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                {editForm._editType === 'course' ? (
                  // Ecosystem Course
                  <>
                    <div>
                      <label style={{ fontSize: 11, color: "#64748b", fontWeight: 800, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Course Title</label>
                      <input value={editForm.title || ""} onChange={e => setEditForm({...editForm, title: e.target.value})} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", color: "#1e293b", fontSize: 13, outline: "none", fontWeight: 600 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#64748b", fontWeight: 800, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Duration</label>
                      <input value={editForm.duration || ""} onChange={e => setEditForm({...editForm, duration: e.target.value})} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", color: "#1e293b", fontSize: 13, outline: "none", fontWeight: 600 }} />
                    </div>
                  </>
                ) : editForm._editType === 'event' ? (
                  // Ecosystem Event
                  <>
                    <div>
                      <label style={{ fontSize: 11, color: "#64748b", fontWeight: 800, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Event Name</label>
                      <input value={editForm.name || ""} onChange={e => setEditForm({...editForm, name: e.target.value})} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", color: "#1e293b", fontSize: 13, outline: "none", fontWeight: 600 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#64748b", fontWeight: 800, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Location</label>
                      <input value={editForm.location || ""} onChange={e => setEditForm({...editForm, location: e.target.value})} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", color: "#1e293b", fontSize: 13, outline: "none", fontWeight: 600 }} />
                    </div>
                  </>
                ) : editForm._editType === 'supervisor' ? (
                  // Supervisor
                  <>
                    <div>
                      <label style={{ fontSize: 11, color: "#64748b", fontWeight: 800, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Full Name</label>
                      <input value={editForm.name || ""} onChange={e => setEditForm({...editForm, name: e.target.value})} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", color: "#1e293b", fontSize: 13, outline: "none", fontWeight: 600 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#64748b", fontWeight: 800, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Expertise</label>
                      <input value={editForm.expertise || ""} onChange={e => setEditForm({...editForm, expertise: e.target.value})} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", color: "#1e293b", fontSize: 13, outline: "none", fontWeight: 600 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#64748b", fontWeight: 800, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Max Student Quota</label>
                      <input value={editForm.max || ""} type="number" onChange={e => setEditForm({...editForm, max: parseInt(e.target.value) || 0})} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", color: "#1e293b", fontSize: 13, outline: "none", fontWeight: 600 }} />
                    </div>
                  </>
                ) : editForm._editType === 'facilitator' ? (
                  // Facilitator
                  <>
                    <div>
                      <label style={{ fontSize: 11, color: "#64748b", fontWeight: 800, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Full Name</label>
                      <input value={editForm.name || ""} onChange={e => setEditForm({...editForm, name: e.target.value})} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", color: "#1e293b", fontSize: 13, outline: "none", fontWeight: 600 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#64748b", fontWeight: 800, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Department / Discipline</label>
                      <input value={editForm.dept || ""} onChange={e => setEditForm({...editForm, dept: e.target.value})} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", color: "#1e293b", fontSize: 13, outline: "none", fontWeight: 600 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#64748b", fontWeight: 800, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Office Details</label>
                      <input value={editForm.office || ""} onChange={e => setEditForm({...editForm, office: e.target.value})} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", color: "#1e293b", fontSize: 13, outline: "none", fontWeight: 600 }} />
                    </div>
                  </>
                ) : (
                  // Student/Application/Alumni
                  <>
                    <div>
                      <label style={{ fontSize: 11, color: "#64748b", fontWeight: 800, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Full Name</label>
                      <input value={editForm.name || ""} onChange={e => setEditForm({...editForm, name: e.target.value})} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", color: "#1e293b", fontSize: 13, outline: "none", fontWeight: 600 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#64748b", fontWeight: 800, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Programme</label>
                      <input value={editForm.prog || ""} onChange={e => setEditForm({...editForm, prog: e.target.value})} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", color: "#1e293b", fontSize: 13, outline: "none", fontWeight: 600 }} />
                    </div>
                    {editForm.sem !== undefined && (
                      <div>
                        <label style={{ fontSize: 11, color: "#64748b", fontWeight: 800, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Current Semester</label>
                        <select 
                          value={editForm.sem} 
                          onChange={e => setEditForm({...editForm, sem: parseInt(e.target.value)})} 
                          style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", color: "#1e293b", fontSize: 13, outline: "none", fontWeight: 600 }}
                        >
                          {Array.from({ length: (editForm.prog || "").includes("PhD") ? 12 : 6 }, (_, i) => i + 1).map(num => (
                            <option key={num} value={num}>Semester {num}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}
                <div>
                  <label style={{ fontSize: 11, color: "#64748b", fontWeight: 800, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Status</label>
                  <select value={editForm.status || "Active"} onChange={e => setEditForm({...editForm, status: e.target.value})} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", color: "#1e293b", fontSize: 13, outline: "none", fontWeight: 600 }}>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Graduated">Graduated / Completed</option>
                  </select>
                </div>
              </div>
              <textarea value={editReason} onChange={e => setEditReason(e.target.value)} placeholder="Reason for this modification..." rows={3} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", color: "#1e293b", fontSize: 13, outline: "none", marginBottom: 24, resize: "none", fontWeight: 500 }} />
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => {setEditData(null); setEditForm(null); setEditReason("");}} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 20px", color: "#64748b", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>Discard</button>
                <button onClick={handleEditSubmit} style={{ background: "#1e3a8a", border: "none", borderRadius: 8, padding: "10px 24px", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 800 }}>Save Changes</button>
              </div>
            </div>
          </div>
        )}

        {studentHistoryData && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 24, padding: 32, maxWidth: 640, width: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#1e3a8a", fontFamily: "'Syne', sans-serif" }}>👁️ Audit History: {studentHistoryData.name || studentHistoryData.title}</div>
                <button onClick={() => setStudentHistoryData(null)} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, width: 38, height: 38, color: "#64748b", fontSize: 18, cursor: "pointer", fontWeight: 800 }}>×</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {auditLogs.filter(l => l.targetId === studentHistoryData.id).map((l, i) => (
                  <div key={i} style={{ padding: "18px 20px", background: "#f8fafc", borderRadius: 12, border: "1px solid rgba(0,0,0,0.03)", borderLeft: `5px solid ${l.action === "DELETE" ? "#ef4444" : l.action === "EDIT" ? "#f59e0b" : "#008751"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: l.action === "DELETE" ? "#dc2626" : l.action === "EDIT" ? "#d97706" : "#008751", textTransform: "uppercase", letterSpacing: 0.5 }}>{l.action}</span>
                      <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{new Date(l.timestamp).toLocaleString()} by {l.officer}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.5, fontWeight: 500 }}>{l.reason}</div>
                  </div>
                ))}
                {auditLogs.filter(l => l.targetId === studentHistoryData.id).length === 0 && <div style={{ color: "#64748b", fontSize: 13, textAlign: "center", padding: "40px 0", fontWeight: 500 }}>No recorded actions for this student.</div>}
              </div>
            </div>
          </div>
        )}

        {showAuditModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(30,58,138,0.2)", backdropFilter: "blur(8px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 24, padding: 32, maxWidth: 960, width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#1e3a8a", fontFamily: "'Syne', sans-serif", letterSpacing: -0.5 }}>🕒 System Audit Trail</div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <button onClick={() => handleAuditExport('csv')} style={{ background: "rgba(0,135,81,0.08)", border: "1px solid rgba(0,135,81,0.2)", borderRadius: 8, padding: "8px 16px", color: "#008751", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>📥 Export CSV</button>
                  <button onClick={() => handleAuditExport('pdf')} style={{ background: "rgba(30,58,138,0.08)", border: "1px solid rgba(30,58,138,0.2)", borderRadius: 8, padding: "8px 16px", color: "#1e3a8a", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>📄 Export PDF</button>
                  <button onClick={() => setShowAuditModal(false)} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, width: 34, height: 34, color: "#64748b", fontSize: 18, cursor: "pointer", fontWeight: 700, marginLeft: 8 }}>×</button>
                </div>
              </div>
              <div style={{ overflowY: "auto", flex: 1, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 10 }}>
                    <tr>
                      <th style={{ textAlign: "left", padding: "14px 16px", fontSize: 11, fontWeight: 800, color: "#475569", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase" }}>TIMESTAMP</th>
                      <th style={{ textAlign: "left", padding: "14px 16px", fontSize: 11, fontWeight: 800, color: "#475569", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase" }}>ACTION</th>
                      <th style={{ textAlign: "left", padding: "14px 16px", fontSize: 11, fontWeight: 800, color: "#475569", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase" }}>TARGET</th>
                      <th style={{ textAlign: "left", padding: "14px 16px", fontSize: 11, fontWeight: 800, color: "#475569", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase" }}>REASON</th>
                      <th style={{ textAlign: "left", padding: "14px 16px", fontSize: 11, fontWeight: 800, color: "#475569", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase" }}>OFFICER</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((l, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "14px 16px", fontSize: 12, color: "#64748b", fontWeight: 500 }}>{new Date(l.timestamp).toLocaleString()}</td>
                        <td style={{ padding: "14px 16px", fontSize: 12, fontWeight: 800, color: l.action === "DELETE" ? "#dc2626" : l.action === "EDIT" ? "#d97706" : "#008751" }}>{l.action}</td>
                        <td style={{ padding: "14px 16px", fontSize: 12, color: "#0f172a", fontWeight: 600 }}>{l.targetName} <span style={{ color: "#94a3b8", fontWeight: 500 }}>({l.targetId})</span></td>
                        <td style={{ padding: "14px 16px", fontSize: 12, color: "#475569", fontWeight: 500 }}>{l.reason}</td>
                        <td style={{ padding: "14px 16px", fontSize: 12, color: "#008751", fontWeight: 700 }}>{l.officer}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showBinModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 20, padding: 32, maxWidth: 900, width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", fontFamily: "'Syne', sans-serif" }}>🗑️ Recycle Bin</div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <button onClick={() => {setRecycleBin([]); setRefreshKey(prev=>prev+1);}} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "8px 16px", color: "#dc2626", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Empty Bin</button>
                  <button onClick={() => setShowBinModal(false)} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, width: 34, height: 34, color: "#64748b", fontSize: 18, cursor: "pointer", fontWeight: 700 }}>×</button>
                </div>
              </div>
              <div style={{ overflowY: "auto", flex: 1, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 10 }}>
                    <tr>
                      <th style={{ textAlign: "left", padding: "14px 16px", fontSize: 11, fontWeight: 800, color: "#475569", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase" }}>DELETED AT</th>
                      <th style={{ textAlign: "left", padding: "14px 16px", fontSize: 11, fontWeight: 800, color: "#475569", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase" }}>NAME / ID</th>
                      <th style={{ textAlign: "left", padding: "14px 16px", fontSize: 11, fontWeight: 800, color: "#475569", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase" }}>DELETED BY</th>
                      <th style={{ textAlign: "left", padding: "14px 16px", fontSize: 11, fontWeight: 800, color: "#475569", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase" }}>REASON</th>
                      <th style={{ textAlign: "left", padding: "14px 16px", fontSize: 11, fontWeight: 800, color: "#475569", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase" }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recycleBin.map((r, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "14px 16px", fontSize: 12, color: "#64748b", fontWeight: 500 }}>{new Date(r._deletedAt).toLocaleString()}</td>
                        <td style={{ padding: "14px 16px", fontSize: 12, color: "#0f172a", fontWeight: 600 }}>{r.name || r.title} <span style={{ color: "#94a3b8", fontWeight: 500 }}>({r.id})</span></td>
                        <td style={{ padding: "14px 16px", fontSize: 12, color: "#dc2626", fontWeight: 700 }}>{r._officer}</td>
                        <td style={{ padding: "14px 16px", fontSize: 12, color: "#475569", fontWeight: 500 }}>{r._reason}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <button onClick={() => setRestoreData(r)} style={{ fontSize: 11, padding: "6px 14px", background: "rgba(30,58,138,0.08)", border: "1px solid rgba(30,58,138,0.2)", borderRadius: 8, color: "#1e3a8a", cursor: "pointer", fontWeight: 700 }}>Restore</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {recycleBin.length === 0 && <div style={{ color: "#64748b", fontSize: 13, textAlign: "center", padding: "60px 0", fontWeight: 500 }}>Recycle bin is empty.</div>}
              </div>
            </div>
          </div>
        )}

        {/* ── ADD COURSE MODAL ── */}
        {showAddCourseModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowAddCourseModal(false)}>
            <div style={{ width: 480, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 20, padding: 32, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }} onClick={e => e.stopPropagation()}>
              <SectionHeader title="Register New Short Course" subtitle="Manually add a professional training course" theme="light" />
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
                {[["title", "Course Title"], ["duration", "Duration"], ["facilitatorName", "Facilitator Name"], ["startDate", "Start Date"]].map(([f, l]) => (
                  <div key={f}>
                    <label style={{ fontSize: 11, color: "#0f172a", fontWeight: 800, textTransform: "uppercase", marginBottom: 6, display: "block", letterSpacing: 0.5 }}>{l}</label>
                    <input 
                      value={newCourseForm[f]} 
                      onChange={e => setNewCourseForm({ ...newCourseForm, [f]: e.target.value })}
                      type={f === "startDate" ? "date" : "text"}
                      placeholder={`Enter ${l.toLowerCase()}...`}
                      style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", color: "#0f172a", outline: "none", fontSize: 13, fontWeight: 500 }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 11, color: "#0f172a", fontWeight: 800, textTransform: "uppercase", marginBottom: 6, display: "block", letterSpacing: 0.5 }}>Description</label>
                  <textarea 
                    value={newCourseForm.description}
                    onChange={e => setNewCourseForm({ ...newCourseForm, description: e.target.value })}
                    placeholder="Briefly describe the course objectives..."
                    style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", color: "#0f172a", outline: "none", height: 80, resize: "none", fontSize: 13, fontWeight: 500 }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
                <button onClick={() => setShowAddCourseModal(false)} style={{ flex: 1, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 0", color: "#64748b", cursor: "pointer", fontWeight: 700 }}>Cancel</button>
                <button onClick={handleAddCourse} style={{ flex: 1, background: "#1e3a8a", border: "none", borderRadius: 10, padding: "12px 0", color: "#fff", cursor: "pointer", fontWeight: 800 }}>Confirm Registration</button>
              </div>
            </div>
          </div>
        )}

        {/* ── ADD EVENT MODAL ── */}
        {showAddEventModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowAddEventModal(false)}>
            <div style={{ width: 480, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 20, padding: 32, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }} onClick={e => e.stopPropagation()}>
              <SectionHeader title="Schedule Academic Event" subtitle="Add Workshop or Conference details" theme="light" />
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: "#0f172a", fontWeight: 800, textTransform: "uppercase", marginBottom: 6, display: "block", letterSpacing: 0.5 }}>Event Type</label>
                  <select 
                    value={newEventForm.type}
                    onChange={e => setNewEventForm({ ...newEventForm, type: e.target.value })}
                    style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", color: "#0f172a", outline: "none", fontSize: 13, fontWeight: 500 }}
                  >
                    <option value="Workshop">Workshop</option>
                    <option value="Conference">Conference</option>
                  </select>
                </div>
                {["name", "date", "location", "speaker"].map(f => (
                  <div key={f}>
                    <label style={{ fontSize: 11, color: "#0f172a", fontWeight: 800, textTransform: "uppercase", marginBottom: 6, display: "block", letterSpacing: 0.5 }}>{f === "name" ? "Title/Topic" : f.charAt(0).toUpperCase() + f.slice(1)}</label>
                    <input 
                      value={newEventForm[f]} 
                      onChange={e => setNewEventForm({ ...newEventForm, [f]: e.target.value })}
                      type={f === "date" ? "date" : "text"}
                      placeholder={`Enter event ${f}...`}
                      style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", color: "#0f172a", outline: "none", fontSize: 13, fontWeight: 500 }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 11, color: "#0f172a", fontWeight: 800, textTransform: "uppercase", marginBottom: 6, display: "block", letterSpacing: 0.5 }}>Description</label>
                  <textarea 
                    value={newEventForm.description}
                    onChange={e => setNewEventForm({ ...newEventForm, description: e.target.value })}
                    placeholder="Outline event agenda or scope..."
                    style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", color: "#0f172a", outline: "none", height: 80, resize: "none", fontSize: 13, fontWeight: 500 }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
                <button onClick={() => setShowAddEventModal(false)} style={{ flex: 1, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 0", color: "#64748b", cursor: "pointer", fontWeight: 700 }}>Cancel</button>
                <button onClick={handleAddEvent} style={{ flex: 1, background: "#1e3a8a", border: "none", borderRadius: 10, padding: "12px 0", color: "#fff", cursor: "pointer", fontWeight: 800 }}>Post Event</button>
              </div>
            </div>
          </div>
        )}

        {showAddStudentModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowAddStudentModal(false)}>
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 24, padding: 36, maxWidth: 500, width: "100%", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>
              <SectionHeader title="Register New Student" subtitle="Add a student record manually to the registry" theme="light" />
              
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
                <div>
                  <label style={{ fontSize: 11, color: "#0f172a", fontWeight: 800, textTransform: "uppercase", marginBottom: 6, display: "block", letterSpacing: 0.5 }}>Full Name</label>
                  <input 
                    value={newStudentForm.name}
                    onChange={e => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", color: "#0f172a", outline: "none", fontSize: 13, fontWeight: 500 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "#0f172a", fontWeight: 800, textTransform: "uppercase", marginBottom: 6, display: "block", letterSpacing: 0.5 }}>Matric Number</label>
                  <input 
                    value={newStudentForm.matric}
                    onChange={e => setNewStudentForm({ ...newStudentForm, matric: e.target.value })}
                    placeholder="e.g. ACE/2026/1024"
                    style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", color: "#0f172a", outline: "none", fontSize: 13, fontWeight: 500 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "#0f172a", fontWeight: 800, textTransform: "uppercase", marginBottom: 6, display: "block", letterSpacing: 0.5 }}>Study Programme</label>
                  <select 
                    value={newStudentForm.prog}
                    onChange={e => setNewStudentForm({ ...newStudentForm, prog: e.target.value })}
                    style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", color: "#0f172a", outline: "none", fontSize: 13, fontWeight: 500 }}
                  >
                    {PROGRAMMES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#0f172a", fontWeight: 800, textTransform: "uppercase", marginBottom: 6, display: "block", letterSpacing: 0.5 }}>Personal Email</label>
                    <input 
                      value={newStudentForm.email}
                      onChange={e => setNewStudentForm({ ...newStudentForm, email: e.target.value })}
                      placeholder="user@example.com"
                      style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", color: "#0f172a", outline: "none", fontSize: 13, fontWeight: 500 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#0f172a", fontWeight: 800, textTransform: "uppercase", marginBottom: 6, display: "block", letterSpacing: 0.5 }}>Institutional Email</label>
                    <input 
                      value={newStudentForm.instEmail}
                      onChange={e => setNewStudentForm({ ...newStudentForm, instEmail: e.target.value })}
                      placeholder="user@acetel.edu.ng"
                      style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", color: "#0f172a", outline: "none", fontSize: 13, fontWeight: 500 }}
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#0f172a", fontWeight: 800, textTransform: "uppercase", marginBottom: 6, display: "block", letterSpacing: 0.5 }}>Phone</label>
                    <input 
                      value={newStudentForm.phone}
                      onChange={e => setNewStudentForm({ ...newStudentForm, phone: e.target.value })}
                      placeholder="+234..."
                      style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", color: "#0f172a", outline: "none", fontSize: 13, fontWeight: 500 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#0f172a", fontWeight: 800, textTransform: "uppercase", marginBottom: 6, display: "block", letterSpacing: 0.5 }}>Gender</label>
                    <select 
                      value={newStudentForm.gender}
                      onChange={e => setNewStudentForm({ ...newStudentForm, gender: e.target.value })}
                      style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", color: "#0f172a", outline: "none", fontSize: 13, fontWeight: 500 }}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
                <button onClick={() => setShowAddStudentModal(false)} style={{ flex: 1, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 0", color: "#64748b", cursor: "pointer", fontWeight: 700 }}>Cancel</button>
                <button onClick={handleAddStudent} style={{ flex: 1, background: "#008751", border: "none", borderRadius: 10, padding: "12px 0", color: "#fff", cursor: "pointer", fontWeight: 800 }}>Register Student</button>
              </div>
            </div>
          </div>
        )}
        {showExportModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowExportModal(false)}>
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 24, padding: 36, maxWidth: 520, width: "100%", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>
              <SectionHeader title="Customize Export Report" subtitle={`Generating ${exportConfig.target.toUpperCase()} as ${exportConfig.format.toUpperCase()}`} theme="light" />
              
              <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: "#0f172a", fontWeight: 800, textTransform: "uppercase", marginBottom: 10, display: "block", letterSpacing: 0.5 }}>Output Format</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    {["pdf", "csv"].map(f => (
                      <button 
                        key={f}
                        onClick={() => setExportConfig({ ...exportConfig, format: f })}
                        style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid", cursor: "pointer", fontSize: 13, fontWeight: 800, textTransform: "uppercase", transition: "all 0.2s",
                          background: exportConfig.format === f ? (f === 'pdf' ? "#1e3a8a" : "#008751") : "#f8fafc",
                          borderColor: exportConfig.format === f ? "transparent" : "#e2e8f0",
                          color: exportConfig.format === f ? "#fff" : "#64748b"
                        }}
                      >
                        {f} Document
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ height: 1, background: "#f1f5f9", margin: "4px 0" }} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#0f172a", fontWeight: 800, textTransform: "uppercase", marginBottom: 8, display: "block", letterSpacing: 0.5 }}>Study Programme</label>
                    <select value={exportConfig.prog} onChange={e => setExportConfig({ ...exportConfig, prog: e.target.value })} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px", color: "#0f172a", outline: "none", fontSize: 13, fontWeight: 500 }}>
                      <option value="All Programmes">All Programmes</option>
                      {PROGRAMMES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#0f172a", fontWeight: 800, textTransform: "uppercase", marginBottom: 8, display: "block", letterSpacing: 0.5 }}>Academic Intake</label>
                    <select value={exportConfig.session} onChange={e => setExportConfig({ ...exportConfig, session: e.target.value })} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px", color: "#0f172a", outline: "none", fontSize: 13, fontWeight: 500 }}>
                      <option value="All Sessions">All Intakes</option>
                      {ACETEL_SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: "#0f172a", fontWeight: 800, textTransform: "uppercase", marginBottom: 8, display: "block", letterSpacing: 0.5 }}>Semester Level</label>
                  <select value={exportConfig.semester} onChange={e => setExportConfig({ ...exportConfig, semester: e.target.value })} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px", color: "#0f172a", outline: "none", fontSize: 13, fontWeight: 500 }}>
                    <option value="All Semesters">All Semesters</option>
                    {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 40 }}>
                <button onClick={() => setShowExportModal(false)} style={{ flex: 1, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 0", color: "#64748b", cursor: "pointer", fontWeight: 700 }}>Cancel</button>
                <button onClick={handleGranularExport} style={{ flex: 2, background: "#1e3a8a", border: "none", borderRadius: 12, padding: "14px 0", color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 14 }}>Generate Official Report</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
