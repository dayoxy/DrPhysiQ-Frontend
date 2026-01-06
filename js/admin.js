console.log("admin.js loaded");

// ================= AUTH GUARD =================
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
const username = localStorage.getItem("username");

if (!token || role !== "admin") {
    localStorage.clear();
    window.location.href = "index.html";
}

// ================= HEADER =================
const adminUserEl = document.getElementById("adminUser");
if (adminUserEl) {
    adminUserEl.innerText = `Logged in as: ${username}`;
}

// ================= LOGOUT =================
function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}
window.logout = logout;

// ================= LOAD SBUs =================
async function loadSBUs() {
    const res = await apiFetch(`${API_BASE}/admin/sbus`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res) return;

    const sbus = await res.json();

    // SBU summary
    const output = document.getElementById("output");
    if (output) {
        output.innerHTML = sbus
            .map(s => `<p><strong>${s.name}</strong> — ₦${s.daily_budget.toLocaleString()}</p>`)
            .join("");
    }

    // Populate SBU selects
    const sbuSelect = document.getElementById("sbuSelect");
    const reportSBU = document.getElementById("reportSBU");

    if (sbuSelect) {
        sbuSelect.innerHTML = sbus.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
    }

    if (reportSBU) {
        reportSBU.innerHTML = sbus.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
    }
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
    btn.disabled = true;
    btn.innerText = "Saving...";

    const res = await apiFetch(`${API_BASE}/admin/create-staff`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            full_name,
            username: staff_username,
            password,
            department_id: sbu_id
        })
    });

    btn.disabled = false;
    btn.innerText = "Create Staff";

    if (!res) return;

    document.getElementById("full_name").value = "";
    document.getElementById("staff_username").value = "";
    document.getElementById("staff_password").value = "";

    loadStaff();
}

// ================= LOAD STAFF =================
async function loadStaff() {
    const res = await apiFetch(`${API_BASE}/admin/staff`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res) return;

    const staff = await res.json();

    // Staff table
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

    // Staff report dropdown
    const staffSelect = document.getElementById("staffReportSelect");
    if (staffSelect) {
        staffSelect.innerHTML = staff
            .filter(s => s.is_active)
            .map(s => `<option value="${s.id}">${s.full_name}</option>`)
            .join("");
    }
}

// ================= ACTIVATE / DEACTIVATE STAFF =================
async function deactivateStaff(id) {
    if (!confirm("Deactivate this staff member?")) return;

    const res = await apiFetch(`${API_BASE}/admin/staff/${id}/deactivate`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res) return;

    loadStaff();
}

async function activateStaff(id) {
    const res = await apiFetch(`${API_BASE}/admin/staff/${id}/activate`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res) return;

    loadStaff();
}

window.deactivateStaff = deactivateStaff;
window.activateStaff = activateStaff;

// ================= LOAD SBU REPORT =================
async function loadReport() {
    const sbuId = document.getElementById("reportSBU").value;
    const period = document.getElementById("reportPeriod").value;
    const date = document.getElementById("reportDate").value;

    if (!sbuId || !date) {
        showGlobalError("Select SBU and date");
        return;
    }

    const btn = document.getElementById("loadReportBtn");
    btn.disabled = true;
    btn.innerText = "Loading...";

    const res = await apiFetch(
        `${API_BASE}/admin/sbu-report?sbu_id=${sbuId}&period=${period}&report_date=${date}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    btn.disabled = false;
    btn.innerText = "Load Report";

    if (!res) return;

    const data = await res.json();

    document.getElementById("reportResult").innerHTML = `
        <h4>${data.sbu.name}</h4>
        <p>Total Sales: ₦${data.total_sales.toLocaleString()}</p>
        <p>Total Expenses: ₦${data.total_expenses.toLocaleString()}</p>
        <p>Net Profit: ₦${data.net_profit.toLocaleString()}</p>
        <p>Performance: ${data.performance_percent}%</p>
    `;
}

// ================= STAFF SBU REPORT =================
async function loadStaffSBUReport() {
    const staffId = document.getElementById("staffReportSelect").value;
    const period = document.getElementById("staffReportPeriod").value;
    const date = document.getElementById("staffReportDate").value;

    if (!staffId || !date) {
        showGlobalError("Select staff and date");
        return;
    }

    const btn = document.getElementById("loadStaffReportBtn");
    btn.disabled = true;
    btn.innerText = "Loading...";

    const res = await apiFetch(
        `${API_BASE}/admin/staff/${staffId}/sbu-report?period=${period}&report_date=${date}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    btn.disabled = false;
    btn.innerText = "Load Staff Report";

    if (!res) return;

    const data = await res.json();

    document.getElementById("staffReportResult").innerHTML = `
        <h4>${data.staff.name} — ${data.sbu.name}</h4>
        <p>Total Sales: ₦${data.total_sales.toLocaleString()}</p>
        <p>Total Expenses: ₦${data.total_expenses.toLocaleString()}</p>
        <p>Net Profit: ₦${data.net_profit.toLocaleString()}</p>
        <p>Performance: ${data.performance_percent}%</p>
    `;
}
let staffHtml = "<h5>Staff Contributions</h5><table><tr><th>Staff</th><th>Sales</th><th>Expenses</th><th>Net</th></tr>";

(data.staff_breakdown || []).forEach(s => {
    staffHtml += `
        <tr>
            <td>${s.staff_name}</td>
            <td>₦${(s.total_sales ?? 0).toLocaleString()}</td>
            <td>₦${(s.total_expenses ?? 0).toLocaleString()}</td>
            <td>₦${(s.net_profit ?? 0).toLocaleString()}</td>
        </tr>
    `;
});

staffHtml += "</table>";

document.getElementById("reportResult").innerHTML += staffHtml;'

async function loadAuditLogs() {
    const logs = await safeFetch(`${API_BASE}/admin/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!logs) return;

    document.getElementById("auditLog").innerHTML = logs
        .map(l => `<p><strong>${l.staff}</strong> — ${l.action} (${new Date(l.time).toLocaleString()})</p>`)
        .join("");
}



// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
    loadSBUs();
    loadStaff();

    document.getElementById("saveStaffBtn").onclick = createStaff;
    document.getElementById("loadReportBtn").onclick = loadReport;
    document.getElementById("loadStaffReportBtn").onclick = loadStaffSBUReport;
});
