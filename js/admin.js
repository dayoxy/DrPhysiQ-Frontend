console.log("admin.js loaded");

// ================= AUTH GUARD =================
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
const username = localStorage.getItem("username");

if (!token || role !== "admin") {
    localStorage.clear();
    window.location.href = "index.html";
}

// ================= DOM REFERENCES =================
const adminUserEl = document.getElementById("adminUser");

const saveStaffBtn = document.getElementById("saveStaffBtn");
const loadReportBtn = document.getElementById("loadReportBtn");
const loadStaffReportBtn = document.getElementById("loadStaffReportBtn");
const loadRangeReportBtn = document.getElementById("loadRangeReportBtn");
const loadStaffRangeBtn = document.getElementById("loadStaffRangeBtn");

const exportSBUExcelBtn = document.getElementById("exportSBUExcelBtn");
const exportStaffExcelBtn = document.getElementById("exportStaffExcelBtn");
const exportRangeSBUExcelBtn = document.getElementById("exportRangeSBUExcelBtn");
const exportStaffRangeExcelBtn = document.getElementById("exportStaffRangeExcelBtn");

const reportSBU = document.getElementById("reportSBU");
const reportPeriod = document.getElementById("reportPeriod");
const reportDate = document.getElementById("reportDate");
const reportResult = document.getElementById("reportResult");

const staffReportSelect = document.getElementById("staffReportSelect");
const staffReportPeriod = document.getElementById("staffReportPeriod");
const staffReportDate = document.getElementById("staffReportDate");
const staffReportResult = document.getElementById("staffReportResult");

const rangeSBU = document.getElementById("rangeSBU");
const rangeStaffSelect = document.getElementById("rangeStaffSelect");
const rangeStartDate = document.getElementById("rangeStartDate");
const rangeEndDate = document.getElementById("rangeEndDate");
const rangeReportResult = document.getElementById("rangeReportResult");

if (adminUserEl) adminUserEl.innerText = `Logged in as: ${username}`;

// ================= GLOBAL HELPERS =================
function showGlobalError(msg) {
    const banner = document.getElementById("globalError");
    const text = document.getElementById("globalErrorText");
    if (!banner || !text) return;
    text.innerText = msg;
    banner.classList.remove("hidden");
}

function hideGlobalError() {
    document.getElementById("globalError")?.classList.add("hidden");
}

function setButtonLoading(btn, loading, text = "Loading...") {
    if (!btn) return;
    btn.disabled = loading;
    btn.dataset.originalText ||= btn.innerText;
    btn.innerText = loading ? text : btn.dataset.originalText;
}

// ================= SAFE FETCH =================
async function safeFetch(url, options = {}) {
    hideGlobalError();
    try {
        const res = await fetch(url, options);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            showGlobalError(err.detail || "Request failed");
            return null;
        }
        return await res.json();
    } catch {
        showGlobalError("Network error");
        return null;
    }
}

// ================= EXCEL =================
function exportToExcel(filename, rows) {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, filename);
}

// ================= STATE =================
let lastSBUReportData = null;
let lastStaffReportData = null;
let lastRangeSBUData = null;
let lastStaffRangeData = null;

// ================= LOAD SBUs =================
async function loadSBUs() {
    const sbus = await safeFetch(`${API_BASE}/admin/sbus`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    console.log("SBUs loaded:", sbus);

    if (!sbus || !Array.isArray(sbus)) {
        showGlobalError("Failed to load SBUs");
        return;
    }

    const options = sbus
        .map(s => `<option value="${s.id}">${s.name}</option>`)
        .join("");

    // 🔽 DROPDOWNS
    document.getElementById("sbuSelect")?.innerHTML = options;
    document.getElementById("reportSBU")?.innerHTML = options;
    document.getElementById("rangeSBU")?.innerHTML = options;

    // 🔼 TOP DASHBOARD LIST (THIS WAS MISSING)
    const output = document.getElementById("output");
    if (output) {
        output.innerHTML = sbus.length
            ? sbus.map(s => `
                <p>
                    <strong>${s.name}</strong><br>
                    Daily Target: ₦${(s.daily_budget ?? 0).toLocaleString()}
                </p>
            `).join("")
            : "<p class='muted'>No SBUs found</p>";
    }
}

// ================= LOAD STAFF =================
async function loadStaff() {
    const tbody = document.getElementById("staffList");

    if (!tbody) {
        console.error("staffList tbody not found");
        return;
    }

    const staff = await safeFetch(`${API_BASE}/admin/staff`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!staff || !Array.isArray(staff)) return;

    tbody.innerHTML = "";

    staff.forEach(s => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${s.full_name}</td>
            <td>${s.username}</td>
            <td>
                <span class="status-pill ${s.is_active ? "status-good" : "status-bad"}">
                    ${s.is_active ? "Active" : "Inactive"}
                </span>
            </td>
            <td>
                ${
                    s.is_active
                        ? `<button class="danger" onclick="deactivateStaff('${s.id}')">Deactivate</button>`
                        : `<button onclick="activateStaff('${s.id}')">Activate</button>`
                }
                <button class="subtle" onclick="deleteStaff('${s.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // ✅ THIS WAS MISSING
    if (staffReportSelect) {
        const activeStaff = staff.filter(s => s.is_active);
        staffReportSelect.innerHTML = activeStaff.length
            ? activeStaff
                .map(s => `<option value="${s.id}">${s.full_name}</option>`)
                .join("")
            : `<option disabled selected>No active staff</option>`;
    }
}

// ================= RANGE SBU REPORT =================
async function loadRangeSBUReport() {
    if (!rangeSBU.value || !rangeStartDate.value || !rangeEndDate.value) {
        showGlobalError("Select SBU and date range");
        return;
    }

    const data = await safeFetch(
        `${API_BASE}/admin/sbu-report/range?sbu_id=${rangeSBU.value}&start_date=${rangeStartDate.value}&end_date=${rangeEndDate.value}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!data) return;
    lastRangeSBUData = data;

    rangeReportResult.innerHTML = `
        <p>Total Sales: ₦${data.total_sales}</p>
        <p>Total Expenses: ₦${data.total_expenses}</p>
        <p>Net Profit: ₦${data.net_profit}</p>
    `;
}

// ================= EXPORTS =================
if (exportRangeSBUExcelBtn) {
    exportRangeSBUExcelBtn.onclick = () => {
        if (!lastRangeSBUData) return showGlobalError("Load report first");
        exportToExcel("SBU_Range_Report.xlsx", [lastRangeSBUData]);
    };
}

if (exportStaffRangeExcelBtn) {
    exportStaffRangeExcelBtn.onclick = () => {
        if (!lastStaffRangeData) return showGlobalError("Load staff range report first");
        exportToExcel("Staff_Range_Report.xlsx", [lastStaffRangeData]);
    };
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
    loadSBUs();
    loadStaff();

    loadRangeReportBtn && (loadRangeReportBtn.onclick = loadRangeSBUReport);
});
