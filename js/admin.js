console.log("admin.js loaded");

// ================= AUTH GUARD =================
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
const username = localStorage.getItem("username");

if (!token || role !== "admin") {
    localStorage.clear();
    window.location.href = "index.html";
}

// ================= DOM HELPERS =================
function el(id) {
    return document.getElementById(id);
}

function setHTML(id, html) {
    const node = el(id);
    if (node) node.innerHTML = html;
}

function showGlobalError(msg) {
    const banner = el("globalError");
    const text = el("globalErrorText");
    if (!banner || !text) return;
    text.innerText = msg;
    banner.classList.remove("hidden");
}

function hideGlobalError() {
    const banner = el("globalError");
    if (banner) banner.classList.add("hidden");
}

// ================= HEADER =================
const adminUserEl = el("adminUser");
if (adminUserEl) adminUserEl.innerText = `Logged in as: ${username}`;

// ================= LOGOUT =================
function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}
window.logout = logout;

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
    } catch (e) {
        console.error(e);
        showGlobalError("Network error");
        return null;
    }
}

// ================= EXCEL EXPORT =================
function exportToExcel(filename, rows) {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, filename);
}

// ================= STATE =================
let lastSBUReport = null;
let lastRangeSBUReport = null;

// ================= LOAD SBUs =================
async function loadSBUs() {
    const sbus = await safeFetch(`${API_BASE}/admin/sbus`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    console.log("SBUs:", sbus);

    if (!Array.isArray(sbus)) return;

    // Top dashboard list
    setHTML(
        "output",
        sbus.length
            ? sbus.map(s => `
                <p>
                    <strong>${s.name}</strong><br>
                    Daily Target: ₦${(s.daily_budget ?? 0).toLocaleString()}
                </p>
            `).join("")
            : "<p class='muted'>No SBUs found</p>"
    );

    // Dropdowns
    const options = sbus
        .map(s => `<option value="${s.id}">${s.name}</option>`)
        .join("");

    setHTML("sbuSelect", options);
    setHTML("reportSBU", options);
    setHTML("rangeSBU", options);
}

// ================= LOAD STAFF =================
async function loadStaff() {
    const tbody = el("staffList");
    if (!tbody) return;

    const staff = await safeFetch(`${API_BASE}/admin/staff`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!Array.isArray(staff)) return;

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
                        ? `<button onclick="deactivateStaff('${s.id}')">Deactivate</button>`
                        : `<button onclick="activateStaff('${s.id}')">Activate</button>`
                }
                <button class="subtle" onclick="deleteStaff('${s.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ================= ACTIVATE / DEACTIVATE =================
async function deactivateStaff(id) {
    if (!confirm("Deactivate staff?")) return;
    const ok = await safeFetch(`${API_BASE}/admin/staff/${id}/deactivate`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
    });
    if (ok) loadStaff();
}

async function activateStaff(id) {
    const ok = await safeFetch(`${API_BASE}/admin/staff/${id}/activate`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
    });
    if (ok) loadStaff();
}

async function deleteStaff(id) {
    if (!confirm("Delete staff permanently?")) return;
    const ok = await safeFetch(`${API_BASE}/admin/staff/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
    });
    if (ok) loadStaff();
}

window.deactivateStaff = deactivateStaff;
window.activateStaff = activateStaff;
window.deleteStaff = deleteStaff;

// ================= SBU REPORT (SINGLE DATE) =================
async function loadSBUReport() {
    const sbuId = el("reportSBU")?.value;
    const period = el("reportPeriod")?.value;
    const date = el("reportDate")?.value;

    if (!sbuId || !date) {
        showGlobalError("Select SBU and date");
        return;
    }

    const data = await safeFetch(
        `${API_BASE}/admin/sbu-report?sbu_id=${sbuId}&period=${period}&report_date=${date}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!data) return;
    lastSBUReport = data;

    setHTML("reportResult", `
        <p>Total Sales: ₦${data.total_sales.toLocaleString()}</p>
        <p>Total Expenses: ₦${data.total_expenses.toLocaleString()}</p>
        <p>Net Profit: ₦${data.net_profit.toLocaleString()}</p>
    `);
}

// ================= SBU REPORT (DATE RANGE) =================
async function loadRangeSBUReport() {
    const sbuId = el("rangeSBU")?.value;
    const start = el("rangeStartDate")?.value;
    const end = el("rangeEndDate")?.value;

    if (!sbuId || !start || !end) {
        showGlobalError("Select SBU and date range");
        return;
    }

    const data = await safeFetch(
        `${API_BASE}/admin/sbu-report/range?sbu_id=${sbuId}&start_date=${start}&end_date=${end}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!data) return;
    lastRangeSBUReport = data;

    setHTML("rangeReportResult", `
        <p>Total Sales: ₦${data.total_sales.toLocaleString()}</p>
        <p>Fixed Expenses: ₦${data.fixed_expenses.toLocaleString()}</p>
        <p>Variable Expenses: ₦${data.variable_expenses.toLocaleString()}</p>
        <p><strong>Net Profit:</strong> ₦${data.net_profit.toLocaleString()}</p>
    `);
}

async function loadStaffSBUReport() {
    if (!staffReportSelect.value || !staffReportDate.value) {
        showGlobalError("Select staff and date");
        return;
    }

    const staffId = staffReportSelect.value;
    const period = staffReportPeriod.value;
    const date = staffReportDate.value;

    setButtonLoading(loadStaffReportBtn, true);

    const data = await safeFetch(
        `${API_BASE}/admin/staff/${staffId}/sbu-report?period=${period}&report_date=${date}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    setButtonLoading(loadStaffReportBtn, false);
    if (!data) return;

    lastStaffReportData = data;

    staffReportResult.innerHTML = `
        <h4>${data.staff.name} — ${data.sbu.name}</h4>
        <p>Total Sales: ₦${data.total_sales.toLocaleString()}</p>
        <p>Total Expenses: ₦${data.total_expenses.toLocaleString()}</p>
        <p><strong>Net Profit:</strong> ₦${data.net_profit.toLocaleString()}</p>
        <p>Performance: ${data.performance_percent}%</p>
    `;
}


// ================= EXPORT =================
const exportSBUExcelBtn = el("exportSBUExcelBtn");
if (exportSBUExcelBtn) {
    exportSBUExcelBtn.onclick = () => {
        if (!lastSBUReport) return showGlobalError("Load report first");
        exportToExcel("SBU_Report.xlsx", [lastSBUReport]);
    };
}

const exportRangeSBUExcelBtn = el("exportRangeSBUExcelBtn");
if (exportRangeSBUExcelBtn) {
    exportRangeSBUExcelBtn.onclick = () => {
        if (!lastRangeSBUReport) return showGlobalError("Load range report first");
        exportToExcel("SBU_Range_Report.xlsx", [lastRangeSBUReport]);
    };
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
    loadSBUs();
    loadStaff();
    loadStaffForReports();

    el("loadReportBtn")?.addEventListener("click", loadSBUReport);
    el("loadRangeReportBtn")?.addEventListener("click", loadRangeSBUReport);
    el("loadStaffReportBtn")?.addEventListener("click", loadStaffSBUReport);
});
