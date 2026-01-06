console.log("admin.js loaded");

// ================= AUTH GUARD =================
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
const username = localStorage.getItem("username");

if (!token || role !== "admin") {
    localStorage.clear();
    window.location.href = "index.html";
}

// ================= GLOBAL UI HELPERS =================
function showGlobalError(msg) {
    const banner = document.getElementById("globalError");
    const text = document.getElementById("globalErrorText");
    if (!banner || !text) return;
    text.innerText = msg;
    banner.classList.remove("hidden");
}

function hideGlobalError() {
    const banner = document.getElementById("globalError");
    if (banner) banner.classList.add("hidden");
}

function setButtonLoading(btn, loading, text = "Loading...") {
    if (!btn) return;
    btn.disabled = loading;
    btn.dataset.originalText ||= btn.innerText;
    btn.innerText = loading ? text : btn.dataset.originalText;
}

// ================= EXCEL EXPORT =================
function exportToExcel(filename, rows) {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, filename);
}

function exportSBUReportExcel(data, sbuName, period) {
    const rows = [
        { Metric: "Total Sales", Value: data.total_sales },
        { Metric: "Total Expenses", Value: data.total_expenses },
        { Metric: "Net Profit", Value: data.net_profit },
        { Metric: "Performance (%)", Value: data.performance_percent }
    ];

    if (data.staff_breakdown?.length) {
        data.staff_breakdown.forEach(s => {
            rows.push({
                Metric: `Staff: ${s.staff_name}`,
                Value: `Sales: ₦${s.total_sales}, Expenses: ₦${s.total_expenses}, Net: ₦${s.net_profit}`
            });
        });
    }

    exportToExcel(`${sbuName}_${period}_SBU_Report.xlsx`, rows);
}

let lastSBUReportData = null;
let lastStaffReportData = null;

// ================= HEADER =================
const adminUserEl = document.getElementById("adminUser");
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
    } catch (err) {
        console.error(err);
        showGlobalError("Network error. Please check your connection.");
        return null;
    }
}

// ================= LOAD SBUs =================
async function loadSBUs() {
    const sbus = await safeFetch(`${API_BASE}/admin/sbus`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!sbus) return;

    const output = document.getElementById("output");
    if (output) {
        output.innerHTML = sbus.length
            ? sbus.map(s =>
                `<p><strong>${s.name}</strong> — ₦${(s.daily_budget ?? 0).toLocaleString()}</p>`
              ).join("")
            : "<p class='muted'>No SBUs found</p>";
    }

    const options = sbus.map(s => `<option value="${s.id}">${s.name}</option>`).join("");

    const sbuSelect = document.getElementById("sbuSelect");
    const reportSBU = document.getElementById("reportSBU");

    if (sbuSelect) sbuSelect.innerHTML = options;
    if (reportSBU) reportSBU.innerHTML = options;
}

// ================= CREATE STAFF =================
async function createStaff() {
    const full_name = document.getElementById("full_name").value.trim();
    const staff_username = document.getElementById("staff_username").value.trim();
    const password = document.getElementById("staff_password").value;
    const sbu_id = document.getElementById("sbuSelect").value;

    if (!full_name || !staff_username || !password || !sbu_id) {
        showGlobalError("Please fill all staff fields");
        return;
    }

    const btn = document.getElementById("saveStaffBtn");
    setButtonLoading(btn, true, "Creating...");

    const result = await safeFetch(`${API_BASE}/admin/create-staff`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            full_name,
            username: staff_username,
            password,
            sbu_id
        })
    });

    setButtonLoading(btn, false);
    if (!result) return;

    ["full_name", "staff_username", "staff_password"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    loadStaff();
}

// ================= LOAD STAFF =================
async function loadStaff() {
    const staff = await safeFetch(`${API_BASE}/admin/staff`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!staff) return;

    const tbody = document.getElementById("staffList");
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
            </td>
        `;
        tbody.appendChild(tr);
    });

    const staffSelect = document.getElementById("staffReportSelect");
    if (staffSelect) {
        const active = staff.filter(s => s.is_active);
        staffSelect.innerHTML = active.length
            ? active.map(s => `<option value="${s.id}">${s.full_name}</option>`).join("")
            : `<option disabled selected>No active staff</option>`;
    }
}

// ================= ACTIVATE / DEACTIVATE =================
async function deactivateStaff(id) {
    if (!confirm("Deactivate this staff member?")) return;
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

window.deactivateStaff = deactivateStaff;
window.activateStaff = activateStaff;

// ================= SBU REPORT =================
async function loadReport() {
    const sbuSelect = document.getElementById("reportSBU");
    const sbuId = sbuSelect.value;
    const sbuName = sbuSelect.selectedOptions[0]?.text || "SBU";
    const period = document.getElementById("reportPeriod").value;
    const date = document.getElementById("reportDate").value;

    if (!sbuId || !date) {
        showGlobalError("Select SBU and date");
        return;
    }

    const btn = document.getElementById("loadReportBtn");
    setButtonLoading(btn, true);

    const data = await safeFetch(
        `${API_BASE}/admin/sbu-report?sbu_id=${sbuId}&period=${period}&report_date=${date}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    setButtonLoading(btn, false);
    if (!data) return;

    lastSBUReportData = data;

    let html = `
        <h4>${sbuName} — ${period} Report</h4>
        <p>Total Sales: ₦${data.total_sales.toLocaleString()}</p>
        <p>Total Expenses: ₦${data.total_expenses.toLocaleString()}</p>
        <p>Net Profit: ₦${data.net_profit.toLocaleString()}</p>
        <p>Performance: ${data.performance_percent}%</p>
    `;

    document.getElementById("reportResult").innerHTML = html;
}

// ================= STAFF SBU REPORT =================
async function loadStaffSBUReport() {
    const staffId = document.getElementById("staffReportSelect")?.value;
    const period = document.getElementById("staffReportPeriod")?.value;
    const date = document.getElementById("staffReportDate")?.value;

    if (!staffId || !date) {
        showGlobalError("Select staff and date");
        return;
    }

    const btn = document.getElementById("loadStaffReportBtn");
    setButtonLoading(btn, true);

    const data = await safeFetch(
        `${API_BASE}/admin/staff/${staffId}/sbu-report?period=${period}&report_date=${date}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    setButtonLoading(btn, false);
    if (!data) return;

    lastStaffReportData = data;

    document.getElementById("staffReportResult").innerHTML = `
        <h4>${data.staff.name} — ${data.sbu.name}</h4>
        <p>Total Sales: ₦${data.total_sales.toLocaleString()}</p>
        <p>Total Expenses: ₦${data.total_expenses.toLocaleString()}</p>
        <p>Net Profit: ₦${data.net_profit.toLocaleString()}</p>
        <p>Performance: ${data.performance_percent}%</p>
    `;
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
    loadSBUs();
    loadStaff();

    document.getElementById("saveStaffBtn").onclick = createStaff;
    document.getElementById("loadReportBtn").onclick = loadReport;
    document.getElementById("loadStaffReportBtn").onclick = loadStaffSBUReport;
});
