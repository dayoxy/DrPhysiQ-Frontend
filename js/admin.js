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
    document.getElementById("sbuSelect").innerHTML = options;
    document.getElementById("reportSBU").innerHTML = options;
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
            <td style="display:flex; gap:6px;">
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

    const staffSelect = document.getElementById("staffReportSelect");
    const active = staff.filter(s => s.is_active);
    staffSelect.innerHTML = active.length
        ? active.map(s => `<option value="${s.id}">${s.full_name}</option>`).join("")
        : `<option disabled selected>No active staff</option>`;
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
    const sbuId = reportSBU.value;
    const sbuName = reportSBU.selectedOptions[0].text;
    const period = reportPeriod.value;
    const date = reportDate.value;

    if (!sbuId || !date) {
        showGlobalError("Select SBU and date");
        return;
    }

    const btn = loadReportBtn;
    setButtonLoading(btn, true);

    const data = await safeFetch(
        `${API_BASE}/admin/sbu-report?sbu_id=${sbuId}&period=${period}&report_date=${date}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    setButtonLoading(btn, false);
    if (!data) return;

    if (!data.total_sales && !data.total_expenses) {
        reportResult.innerHTML = "<p class='muted'>No data available for this period.</p>";
        return;
    }

    lastSBUReportData = data;

    reportResult.innerHTML = `
        <h4>${sbuName} — ${period} Report</h4>
        <p>Total Sales: ₦${data.total_sales.toLocaleString()}</p>
        <p>Total Expenses: ₦${data.total_expenses.toLocaleString()}</p>
        <p>Net Profit: ₦${data.net_profit.toLocaleString()}</p>
        <p>Performance: ${data.performance_percent}%</p>
    `;
}

// ================= STAFF SBU REPORT =================
async function loadStaffSBUReport() {
    const staffId = staffReportSelect.value;
    const period = staffReportPeriod.value;
    const date = staffReportDate.value;

    if (!staffId || !date) {
        showGlobalError("Select staff and date");
        return;
    }

    const btn = loadStaffReportBtn;
    setButtonLoading(btn, true);

    const data = await safeFetch(
        `${API_BASE}/admin/staff/${staffId}/sbu-report?period=${period}&report_date=${date}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    setButtonLoading(btn, false);
    if (!data) return;

    lastStaffReportData = data;

    staffReportResult.innerHTML = `
        <h4>${data.staff.name} — ${data.sbu.name}</h4>
        <p>Total Sales: ₦${data.total_sales.toLocaleString()}</p>
        <p>Total Expenses: ₦${data.total_expenses.toLocaleString()}</p>
        <p>Net Profit: ₦${data.net_profit.toLocaleString()}</p>
        <p>Performance: ${data.performance_percent}%</p>
    `;
}

async function deleteStaff(id) {
    if (!confirm("This will permanently delete the staff account. Continue?")) return;

    const ok = await safeFetch(`${API_BASE}/admin/staff/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
    });

    if (ok) loadStaff();
}

window.deleteStaff = deleteStaff;
// ================= EXPORT HANDLERS =================
exportSBUExcelBtn.onclick = () => {
    if (!lastSBUReportData) {
        showGlobalError("Load an SBU report first");
        return;
    }
    exportToExcel("SBU_Report.xlsx", lastSBUReportData.staff_breakdown || []);
};

exportStaffExcelBtn.onclick = () => {
    if (!lastStaffReportData) {
        showGlobalError("Load a staff report first");
        return;
    }
    exportToExcel(
        `${lastStaffReportData.staff.name}_Staff_Report.xlsx`,
        [
            { Metric: "Total Sales", Value: lastStaffReportData.total_sales },
            { Metric: "Total Expenses", Value: lastStaffReportData.total_expenses },
            { Metric: "Net Profit", Value: lastStaffReportData.net_profit },
            { Metric: "Performance (%)", Value: lastStaffReportData.performance_percent }
        ]
    );
};

// ================= PASSWORD TOGGLE =================
toggleStaffPassword.addEventListener("change", () => {
    staff_password.type = toggleStaffPassword.checked ? "text" : "password";
});

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
    loadSBUs();
    loadStaff();

    saveStaffBtn.onclick = createStaff;
    loadReportBtn.onclick = loadReport;
    loadStaffReportBtn.onclick = loadStaffSBUReport;
});
