
/* ============================
   RESUMELENS WORKSPACE
============================ */

const $ = id => document.getElementById(id);

const STORAGE_KEYS = {
  candidates: "resumelens_candidates",
  profile: "resumelens_profile"
};

let candidates = loadData(STORAGE_KEYS.candidates, []);
let profile = loadData(STORAGE_KEYS.profile, {});

/* ============================
   STORAGE
============================ */

function loadData(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveCandidates() {
  localStorage.setItem(STORAGE_KEYS.candidates, JSON.stringify(candidates));
}

function saveProfile() {
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
}

/* ============================
   NAVIGATION
============================ */

const pages = {
  dashboard: "Overview",
  screening: "Resume Screening",
  candidates: "Candidates",
  compare: "Compare Candidates",
  analytics: "Analytics",
  profile: "Recruiter Profile",
  settings: "Settings"
};

function navigate(page) {
  if (!pages[page]) return;

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));

  const target = $(`page-${page}`);
  if (target) target.classList.add("active");

  const navButton = document.querySelector(`[data-page="${page}"]`);
  if (navButton) navButton.classList.add("active");

  $("topbarTitle").textContent = pages[page];
  $("breadcrumbText").textContent = pages[page];

  if (page === "dashboard") renderDashboard();
  if (page === "candidates") renderCandidates();
  if (page === "compare") populateCompareOptions();
  if (page === "analytics") renderAnalytics();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => navigate(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => navigate(button.dataset.go));
});

/* ============================
   SIDEBAR
============================ */

$("sidebarToggle").addEventListener("click", () => {
  $("sidebar").classList.toggle("collapsed");
  document.querySelector(".main-content").classList.toggle("expanded");
});

/* ============================
   DATE
============================ */

$("currentDate").textContent = new Date().toLocaleDateString("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric"
});

/* ============================
   RECRUITER PROFILE
============================ */

function refreshProfileDisplay() {
  const name = profile.name || "Recruiter";
  const role = profile.role || "Talent Acquisition";
  const initial = name.charAt(0).toUpperCase();

  $("welcomeName").textContent = name.split(" ")[0];
  $("sidebarRecruiterName").textContent = name;
  $("sidebarRecruiterRole").textContent = role;

  $("sidebarAvatar").textContent = initial;
  $("topbarAvatar").textContent = initial;
  $("profileAvatar").textContent = initial;

  $("recruiterName").value = profile.name || "";
  $("recruiterEmail").value = profile.email || "";
  $("recruiterRole").value = profile.role || "";
  $("recruiterCompany").value = profile.company || "";
  $("recruiterDepartment").value = profile.department || "";
  $("recruiterExperience").value = profile.experience || "";
  $("recruiterSpecialization").value = profile.specialization || "";
}

$("profileForm").addEventListener("submit", e => {
  e.preventDefault();

  profile = {
    name: $("recruiterName").value.trim(),
    email: $("recruiterEmail").value.trim(),
    role: $("recruiterRole").value.trim(),
    company: $("recruiterCompany").value.trim(),
    department: $("recruiterDepartment").value.trim(),
    experience: $("recruiterExperience").value,
    specialization: $("recruiterSpecialization").value
  };

  saveProfile();
  refreshProfileDisplay();

  alert("Recruiter profile saved!");
});

/* ============================
   DASHBOARD
============================ */

function getScore(candidate) {
  return Math.max(0, Math.min(100, Number(candidate.match_score) || 0));
}

function renderDashboard() {
  const total = candidates.length;
  const average = total
    ? Math.round(candidates.reduce((sum, c) => sum + getScore(c), 0) / total)
    : 0;

  const shortlisted = candidates.filter(c => c.shortlisted).length;

  $("totalCandidates").textContent = total;
  $("averageScore").textContent = total ? `${average}%` : "--";
  $("shortlistedCount").textContent = shortlisted;
  $("screeningCount").textContent = total;

  const recent = [...candidates].slice(0, 5);

  if (!recent.length) {
    $("recentCandidates").innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">♙</div>
        <h3>No candidates yet</h3>
        <p>Your screened resumes will appear here.</p>
        <button class="secondary-btn" data-go="screening">
          Screen your first resume
        </button>
      </div>`;
    return;
  }

  $("recentCandidates").innerHTML = recent.map(c => candidateRow(c, false)).join("");
  attachCandidateActions($("recentCandidates"));
}

/* ============================
   CANDIDATE ROW
============================ */

function candidateRow(c, showActions = true) {
  const initials = escapeHtml((c.name || "Candidate").charAt(0).toUpperCase());

  return `
    <div class="candidate-row" data-id="${c.id}">
      <div class="candidate-avatar">${initials}</div>

      <div class="candidate-row-info">
        <strong>${escapeHtml(c.name || "Unnamed Candidate")}</strong>
        <p>${escapeHtml(c.job_title || "Resume screening")} · ${escapeHtml(c.date || "")}</p>
      </div>

      <div class="candidate-score">${getScore(c)}%</div>

      ${showActions ? `
        <div class="candidate-actions">
          <button class="shortlist-btn ${c.shortlisted ? "shortlisted" : ""}"
                  data-action="shortlist" data-id="${c.id}">
            ${c.shortlisted ? "★ Shortlisted" : "☆ Shortlist"}
          </button>
          <button data-action="view" data-id="${c.id}">View</button>
          <button data-action="delete" data-id="${c.id}">Delete</button>
        </div>` : ""}
    </div>`;
}

/* ============================
   CANDIDATE DATABASE
============================ */

function renderCandidates() {
  const search = ($("candidateSearch").value || "").toLowerCase();
  const filter = $("candidateFilter").value;

  let filtered = candidates.filter(c => {
    const matchesSearch =
      (c.name || "").toLowerCase().includes(search) ||
      (c.job_title || "").toLowerCase().includes(search);

    let matchesFilter = true;

    if (filter === "shortlisted") matchesFilter = !!c.shortlisted;
    if (filter === "high") matchesFilter = getScore(c) >= 75;
    if (filter === "low") matchesFilter = getScore(c) < 50;

    return matchesSearch && matchesFilter;
  });

  if (!filtered.length) {
    $("candidateDatabase").innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">♙</div>
        <h3>No matching candidates</h3>
        <p>Try changing the search or screening a new resume.</p>
        <button class="primary-btn" data-go="screening">Screen a resume</button>
      </div>`;
    return;
  }

  $("candidateDatabase").innerHTML = filtered.map(c => candidateRow(c, true)).join("");
  attachCandidateActions($("candidateDatabase"));
}

$("candidateSearch").addEventListener("input", renderCandidates);
$("candidateFilter").addEventListener("change", renderCandidates);

/* ============================
   CANDIDATE ACTIONS
============================ */

function attachCandidateActions(container) {
  container.querySelectorAll("[data-action]").forEach(button => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
      const action = button.dataset.action;
      const candidate = candidates.find(c => String(c.id) === String(id));

      if (!candidate) return;

      if (action === "shortlist") {
        candidate.shortlisted = !candidate.shortlisted;
        saveCandidates();
        renderDashboard();
        renderCandidates();
        renderAnalytics();
      }

      if (action === "delete") {
        if (!confirm(`Delete ${candidate.name || "this candidate"}?`)) return;

        candidates = candidates.filter(c => String(c.id) !== String(id));
        saveCandidates();
        renderDashboard();
        renderCandidates();
        renderAnalytics();
        populateCompareOptions();
      }

      if (action === "view") {
        showSavedReport(candidate);
      }
    });
  });
}

/* ============================
   SAVED REPORT VIEW
============================ */

function showSavedReport(c) {
  navigate("screening");

  $("status").classList.add("hidden");
  $("results").classList.remove("hidden");

  renderReport(c);
  $("results").scrollIntoView({ behavior: "smooth" });
}

/* ============================
   CANDIDATE COMPARISON
============================ */

function populateCompareOptions() {
  const options = candidates.map(c =>
    `<option value="${c.id}">${escapeHtml(c.name || "Candidate")} — ${getScore(c)}%</option>`
  ).join("");

  $("compareCandidate1").innerHTML = `<option value="">Select candidate</option>${options}`;
  $("compareCandidate2").innerHTML = `<option value="">Select candidate</option>${options}`;
}

$("compareBtn").addEventListener("click", () => {
  const id1 = $("compareCandidate1").value;
  const id2 = $("compareCandidate2").value;

  const a = candidates.find(c => String(c.id) === id1);
  const b = candidates.find(c => String(c.id) === id2);

  if (!a || !b) {
    $("comparisonResults").innerHTML = `<p class="status error">Select two candidates first.</p>`;
    return;
  }

  if (a.id === b.id) {
    $("comparisonResults").innerHTML = `<p class="status error">Please select two different candidates.</p>`;
    return;
  }

  renderComparison(a, b);
});

function renderComparison(a, b) {
  const skillsA = a.matched_skills || [];
  const skillsB = b.matched_skills || [];
  const allSkills = [...new Set([...skillsA, ...skillsB])];

  const tableRows = allSkills.map(skill => `
    <tr>
      <td>${escapeHtml(skill)}</td>
      <td>${skillsA.includes(skill) ? "✓ Match" : "—"}</td>
      <td>${skillsB.includes(skill) ? "✓ Match" : "—"}</td>
    </tr>
  `).join("");

  $("comparisonResults").innerHTML = `
    <div class="comparison-grid">
      <div class="comparison-candidate">
        <div class="candidate-avatar" style="margin:auto">${escapeHtml((a.name || "A")[0])}</div>
        <h3>${escapeHtml(a.name || "Candidate A")}</h3>
        <div class="comparison-score">${getScore(a)}%</div>
        <p>${escapeHtml(a.recommendation || "")}</p>
      </div>

      <div class="comparison-candidate">
        <div class="candidate-avatar" style="margin:auto">${escapeHtml((b.name || "B")[0])}</div>
        <h3>${escapeHtml(b.name || "Candidate B")}</h3>
        <div class="comparison-score">${getScore(b)}%</div>
        <p>${escapeHtml(b.recommendation || "")}</p>
      </div>
    </div>

    <div class="result-card">
      <h3>Skills comparison</h3>
      ${allSkills.length ? `
        <table class="comparison-table">
          <thead>
            <tr><th>Skill</th><th>${escapeHtml(a.name || "Candidate A")}</th><th>${escapeHtml(b.name || "Candidate B")}</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>` : `<p>No matched skills are available to compare.</p>`}
    </div>

    <div class="two-col">
      <div class="result-card">
        <h3>${escapeHtml(a.name || "Candidate A")} — Strengths</h3>
        ${listItems(a.strengths)}
      </div>
      <div class="result-card">
        <h3>${escapeHtml(b.name || "Candidate B")} — Strengths</h3>
        ${listItems(b.strengths)}
      </div>
    </div>

    <div class="result-card">
      <h3>Comparison overview</h3>
      <p>${escapeHtml(a.name || "Candidate A")} scored ${getScore(a)}%, while ${escapeHtml(b.name || "Candidate B")} scored ${getScore(b)}%.</p>
      <p>This comparison is based on AI screening results. Review the candidates' actual experience and evidence before making a hiring decision.</p>
    </div>
  `;
}

/* ============================
   ANALYTICS
============================ */


function renderAnalytics() {
  const total = candidates.length;

  const average = total
    ? Math.round(candidates.reduce((sum, c) => sum + getScore(c), 0) / total)
    : 0;

  const strong = candidates.filter(c => getScore(c) >= 75).length;
  const shortlisted = candidates.filter(c => c.shortlisted).length;
  const notShortlisted = total - shortlisted;

  $("analyticsTotal").textContent = total;
  $("analyticsAverage").textContent = total ? `${average}%` : "--";
  $("analyticsStrong").textContent = strong;

  if (!total) {
    $("analyticsContent").innerHTML = `
      <div class="empty-state">
        <h3>No analytics yet</h3>
        <p>Screen resumes to start collecting recruitment insights.</p>
      </div>`;
    return;
  }

  // Score distribution
  const buckets = [
    { label: "0–49%", count: candidates.filter(c => getScore(c) < 50).length },
    { label: "50–74%", count: candidates.filter(c => getScore(c) >= 50 && getScore(c) < 75).length },
    { label: "75–100%", count: candidates.filter(c => getScore(c) >= 75).length }
  ];

  const maxBucket = Math.max(...buckets.map(b => b.count), 1);

  // Shortlist breakdown
  const shortlistPercent = total
    ? Math.round((shortlisted / total) * 100)
    : 0;

  // Screening activity by date
  function parseCandidateDate(value) {
    if (!value) return null;

    const text = String(value).trim();

    // Handle DD/MM/YYYY
    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

    if (match) {
      const date = new Date(
        Number(match[3]),
        Number(match[2]) - 1,
        Number(match[1])
      );

      return isNaN(date) ? null : date;
    }

    const parsed = new Date(text);
    return isNaN(parsed) ? null : parsed;
  }

  const dateMap = {};

  candidates.forEach(c => {
    const date = parseCandidateDate(c.date);
    if (!date) return;

    const key = date.toISOString().split("T")[0];
    dateMap[key] = (dateMap[key] || 0) + 1;
  });

  const trendData = Object.entries(dateMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7);

  // Skill frequency - works across all job roles
  const skillMap = {};

  candidates.forEach(c => {
    (c.matched_skills || []).forEach(skill => {
      const name = String(skill).trim();
      if (!name) return;

      const key = name.toLowerCase();
      if (!skillMap[key]) {
        skillMap[key] = { name, count: 0 };
      }

      skillMap[key].count++;
    });
  });

  const topSkills = Object.values(skillMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const maxSkill = Math.max(...topSkills.map(s => s.count), 1);

  // Job role distribution
  const roleMap = {};

  candidates.forEach(c => {
    const role = c.job_title || "General role";
    roleMap[role] = (roleMap[role] || 0) + 1;
  });

  const topRoles = Object.entries(roleMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const maxRole = Math.max(...topRoles.map(r => r[1]), 1);

  // SVG screening trend chart
  const chartWidth = 600;
  const chartHeight = 220;
  const padding = 40;

  const trendValues = trendData.map(d => d[1]);
  const maxTrend = Math.max(...trendValues, 1);

  const points = trendData.map((d, i) => {
    const x = trendData.length === 1
      ? chartWidth / 2
      : padding + i * ((chartWidth - padding * 2) / (trendData.length - 1));

    const y = chartHeight - padding -
      (d[1] / maxTrend) * (chartHeight - padding * 2);

    return { x, y, date: d[0], count: d[1] };
  });

  const linePoints = points.map(p => `${p.x},${p.y}`).join(" ");

  const trendChart = trendData.length
    ? `
      <svg viewBox="0 0 ${chartWidth} ${chartHeight}"
           style="width:100%;height:auto;overflow:visible">

        <line x1="${padding}" y1="${chartHeight - padding}"
              x2="${chartWidth - padding}" y2="${chartHeight - padding}"
              stroke="#e8e5ef" />

        ${points.length > 1 ? `
          <polyline points="${linePoints}"
            fill="none"
            stroke="#8870d5"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"/>
        ` : ""}

        ${points.map(p => `
          <circle cx="${p.x}" cy="${p.y}" r="5"
            fill="#8870d5"
            stroke="white"
            stroke-width="2">
            <title>${p.count} screenings</title>
          </circle>
          <text x="${p.x}" y="${p.y - 12}"
            text-anchor="middle"
            font-size="12"
            fill="#706b80">${p.count}</text>
          <text x="${p.x}" y="${chartHeight - 12}"
            text-anchor="middle"
            font-size="10"
            fill="#898397">${p.date.slice(5)}</text>
        `).join("")}
      </svg>
    `
    : `<p class="empty">No screening dates available.</p>`;

  $("analyticsContent").innerHTML = `
    <style>
      .analytics-modern-grid {
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:18px;
      }

      .analytics-modern-card {
        background:#fff;
        border:1px solid #eeeaf5;
        border-radius:18px;
        padding:22px;
        min-width:0;
      }

      .analytics-modern-card h3 {
        margin:0 0 6px;
        font-size:15px;
        color:#302a43;
      }

      .analytics-modern-card .chart-subtitle {
        font-size:12px;
        color:#9891a6;
        margin-bottom:20px;
      }

      .analytics-modern-row {
        display:grid;
        grid-template-columns:65px 1fr 28px;
        gap:10px;
        align-items:center;
        margin:16px 0;
        font-size:12px;
      }

      .analytics-modern-track {
        height:9px;
        border-radius:20px;
        background:#f0edf6;
        overflow:hidden;
      }

      .analytics-modern-fill {
        height:100%;
        border-radius:20px;
        background:linear-gradient(90deg,#b3a1ef,#8268d4);
      }

      .analytics-modern-donut {
        width:155px;
        height:155px;
        border-radius:50%;
        margin:10px auto 20px;
        display:flex;
        align-items:center;
        justify-content:center;
      }

      .analytics-modern-donut-inner {
        width:105px;
        height:105px;
        border-radius:50%;
        background:white;
        display:flex;
        flex-direction:column;
        align-items:center;
            justify-content:center;
      }

      .analytics-modern-donut-inner strong {
        font-size:25px;
        color:#352c48;
      }

      .analytics-modern-donut-inner span {
        font-size:11px;
        color:#8b849b;
      }

      .analytics-modern-legend {
        display:flex;
        justify-content:center;
        gap:22px;
        flex-wrap:wrap;
        font-size:12px;
        color:#777087;
      }

      .analytics-modern-legend span {
        display:flex;
        align-items:center;
        gap:6px;
      }

      .analytics-modern-dot {
        width:9px;
        height:9px;
        border-radius:50%;
        display:inline-block;
      }

      .analytics-modern-skill {
        margin:14px 0;
      }

      .analytics-modern-skill-head {
        display:flex;
        justify-content:space-between;
        font-size:12px;
        margin-bottom:7px;
        gap:10px;
      }

      .analytics-modern-role {
        display:flex;
        justify-content:space-between;
        gap:10px;
        padding:12px 0;
        border-bottom:1px solid #f1eef6;
        font-size:12px;
      }

      @media(max-width:700px) {
        .analytics-modern-grid {
          grid-template-columns:1fr;
        }
      }
    </style>

    <div class="analytics-modern-grid">

      <!-- SCORE DISTRIBUTION -->
      <div class="analytics-modern-card">
        <h3>Match Score Distribution</h3>
        <div class="chart-subtitle">
          Candidate performance across all job roles
        </div>

        ${buckets.map(b => `
          <div class="analytics-modern-row">
            <span>${b.label}</span>
            <div class="analytics-modern-track">
              <div class="analytics-modern-fill"
                   style="width:${(b.count / maxBucket) * 100}%">
              </div>
            </div>
            <strong>${b.count}</strong>
          </div>
        `).join("")}

        <div style="margin-top:20px;font-size:12px;color:#898397">
          ${strong} candidates scored 75% or above.
        </div>
      </div>

      <!-- SHORTLIST DONUT -->
      <div class="analytics-modern-card">
        <h3>Shortlist Overview</h3>
        <div class="chart-subtitle">
          Candidate selection status
        </div>

        <div class="analytics-modern-donut"
          style="background:conic-gradient(
            #8870d5 ${shortlistPercent}%,
            #eae6f3 ${shortlistPercent}% 100%
          )">
          <div class="analytics-modern-donut-inner">
            <strong>${shortlistPercent}%</strong>
            <span>Shortlisted</span>
          </div>
        </div>

        <div class="analytics-modern-legend">
          <span>
            <i class="analytics-modern-dot"
               style="background:#8870d5"></i>
            Shortlisted (${shortlisted})
          </span>

          <span>
            <i class="analytics-modern-dot"
               style="background:#eae6f3"></i>
            Not shortlisted (${notShortlisted})
          </span>
        </div>
      </div>

      <!-- SCREENING TREND -->
      <div class="analytics-modern-card">
        <h3>Screening Activity</h3>
        <div class="chart-subtitle">
          Candidate screening activity over time
        </div>

        ${trendChart}

        <p style="font-size:12px;color:#898397;margin-top:12px">
          ${trendData.length} screening date(s) recorded.
        </p>
      </div>

      <!-- TOP SKILLS -->
      <div class="analytics-modern-card">
        <h3>Frequently Matched Skills</h3>
        <div class="chart-subtitle">
          Skills found across screened resumes
        </div>

        ${topSkills.length
          ? topSkills.map(s => `
            <div class="analytics-modern-skill">
              <div class="analytics-modern-skill-head">
                <span>${escapeHtml(s.name)}</span>
                <strong>${s.count}</strong>
              </div>
              <div class="analytics-modern-track">
                <div class="analytics-modern-fill"
                  style="width:${(s.count / maxSkill) * 100}%">
                </div>
              </div>
            </div>
          `).join("")
          : `<p class="empty">Matched skills are not available yet.</p>`
        }
      </div>

      <!-- JOB ROLE BREAKDOWN -->
      <div class="analytics-modern-card">
        <h3>Job Role Breakdown</h3>
        <div class="chart-subtitle">
          Candidates screened by position
        </div>

        ${topRoles.map(([role, count]) => `
          <div class="analytics-modern-skill">
            <div class="analytics-modern-skill-head">
              <span>${escapeHtml(role)}</span>
              <strong>${count}</strong>
            </div>
            <div class="analytics-modern-track">
              <div class="analytics-modern-fill"
                style="width:${(count / maxRole) * 100}%">
              </div>
            </div>
          </div>
        `).join("")}
      </div>

      <!-- SUMMARY -->
      <div class="analytics-modern-card">
        <h3>Recruitment Summary</h3>
        <div class="chart-subtitle">
          Overall screening insights
        </div>

        <div style="display:grid;gap:14px;margin-top:20px">
          <div class="analytics-modern-role">
            <span>Total candidates</span>
            <strong>${total}</strong>
          </div>

          <div class="analytics-modern-role">
            <span>Average match score</span>
            <strong>${average}%</strong>
          </div>

          <div class="analytics-modern-role">
            <span>Strong matches</span>
            <strong>${strong}</strong>
          </div>

          <div class="analytics-modern-role">
            <span>Shortlisted</span>
            <strong>${shortlisted}</strong>
          </div>

          <div class="analytics-modern-role">
            <span>Below 75% match</span>
            <strong>${total - strong}</strong>
          </div>
        </div>
      </div>

    </div>
  `;
}


/* ============================
   CLEAR DATA
============================ */

$("clearCandidatesBtn").addEventListener("click", () => {
  if (!confirm("Delete all saved candidate screening records? This cannot be undone.")) return;

  candidates = [];
  saveCandidates();

  renderDashboard();
  renderCandidates();
  renderAnalytics();
  populateCompareOptions();

  $("comparisonResults").innerHTML = "";
  alert("Candidate records cleared.");
});

/* ============================
   SCREENING — EXISTING API
============================ */

const form = $("screenForm");
const fileInput = $("resume");
const fileName = $("fileName");
const browseBtn = $("browseBtn");
const dropArea = $("dropArea");
const statusBox = $("status");
const results = $("results");
const analyzeBtn = $("analyzeBtn");

browseBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  fileName.textContent = fileInput.files[0]?.name || "Drop your PDF resume here";
});

["dragenter", "dragover"].forEach(eventName => {
  dropArea.addEventListener(eventName, e => {
    e.preventDefault();
    dropArea.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach(eventName => {
  dropArea.addEventListener(eventName, e => {
    e.preventDefault();
    dropArea.classList.remove("dragging");
  });
});

dropArea.addEventListener("drop", e => {
  const file = e.dataTransfer.files[0];
  if (!file) return;

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    showStatus("Please upload a PDF resume.", true);
    return;
  }

  const transfer = new DataTransfer();
  transfer.items.add(file);
  fileInput.files = transfer.files;
  fileName.textContent = file.name;
});

function showStatus(message, error = false) {
  statusBox.textContent = message;
  statusBox.classList.remove("hidden", "error");
  if (error) statusBox.classList.add("error");
}

function listItems(items, empty = "Nothing listed.") {
  if (!items?.length) return `<p class="empty">${empty}</p>`;
  return `<ul class="list">${items.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
}

function chips(items, missing = false) {
  if (!items?.length) return '<span class="empty">No items listed.</span>';
  return `<div class="chips">${items.map(x => `<span class="chip ${missing ? "missing" : ""}">${escapeHtml(x)}</span>`).join("")}</div>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

/* ============================
   REPORT RENDERING
============================ */

function renderReport(r) {
  const score = getScore(r);

  results.innerHTML = `
    <div class="result-card">
      <div class="result-head">
        <div class="score" style="--score:${score}%">
          <strong>${score}<small>/100</small></strong>
        </div>
        <div>
          <span class="recommendation">${escapeHtml(r.recommendation)}</span>
          <h2>Screening overview</h2>
          <p>${escapeHtml(r.summary)}</p>
        </div>
      </div>
    </div>

    <div class="two-col">
      <div class="result-card">
        <h3 class="section-title">Matched skills</h3>
        ${chips(r.matched_skills)}
      </div>
      <div class="result-card">
        <h3 class="section-title">Skill gaps</h3>
        ${chips(r.missing_skills, true)}
      </div>
    </div>

    <div class="two-col">
      <div class="result-card">
        <h3>Candidate strengths</h3>
        ${listItems(r.strengths)}
      </div>
      <div class="result-card">
        <h3>Improvement suggestions</h3>
        ${listItems(r.improvement_suggestions)}
      </div>
    </div>

    <div class="two-col">
      <div class="result-card">
        <h3>Experience relevance</h3>
        <p>${escapeHtml(r.experience_relevance)}</p>
      </div>
      <div class="result-card">
        <h3>Education relevance</h3>
        <p>${escapeHtml(r.education_relevance)}</p>
      </div>
    </div>

    <div class="result-card">
      <h3>Suggested interview questions</h3>
      ${listItems(r.interview_questions)}
    </div>

    <div class="result-card">
      <p><strong>Fair-use note:</strong> ${escapeHtml(r.disclaimer)}</p>
    </div>
  `;

  results.classList.remove("hidden");
}

/* ============================
   SCREENING SUBMIT
============================ */

form.addEventListener("submit", async e => {
  e.preventDefault();

  if (!fileInput.files.length) {
    showStatus("Please select a PDF resume.", true);
    return;
  }

  results.classList.add("hidden");
  statusBox.classList.remove("hidden", "error");
  showStatus("Analyzing resume… This may take a few moments.");

  analyzeBtn.disabled = true;
  analyzeBtn.innerHTML = "<span>Analyzing…</span><span>⏳</span>";

  try {
    const fd = new FormData(form);
    const res = await fetch("/api/analyze", {
      method: "POST",
      body: fd
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.detail || "Analysis failed.");

    const candidateName = fileInput.files[0].name
      .replace(/\.pdf$/i, "")
      .replace(/[_-]/g, " ");

    const savedCandidate = {
      ...data,
      id: Date.now(),
      name: candidateName,
      job_title: extractJobTitle($("job_description").value),
      date: new Date().toLocaleDateString("en-IN"),
      shortlisted: false
    };

    candidates.unshift(savedCandidate);
    saveCandidates();

    renderReport(savedCandidate);
    statusBox.classList.add("hidden");

    renderDashboard();
    renderCandidates();
    populateCompareOptions();
    renderAnalytics();

    results.scrollIntoView({ behavior: "smooth", block: "start" });

  } catch (err) {
    showStatus(err.message || "Something went wrong. Please try again.", true);
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = "<span>Analyze candidate</span><span>→</span>";
  }
});

function extractJobTitle(text) {
  const firstLine = text.trim().split("\n").find(line => line.trim());
  if (!firstLine) return "General role";
  return firstLine.trim().substring(0, 80);
}

/* ============================
   INITIALIZATION
============================ */

refreshProfileDisplay();
renderDashboard();
renderCandidates();
renderAnalytics();
populateCompareOptions();
