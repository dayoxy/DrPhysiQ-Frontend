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

// ================= SAFE FETCH =================
async function safeFetch(url, options = {}) {
    try {
        const res = await fetch(url, options);

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert(err.detail || "Request failed");
            return null;
        }

        return await res.json();
    } catch (err) {
        console.error("Network error:", err);
        alert("Network error. Please try again.");
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
            : "<p>No SBUs found</p>";
    }

    const options = sbus
        .map(s => `<option value="${s.id}">${s.name}</option>`)
        .join("");

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
        alert("Please fill all staff fields");
        return;
    }

    const btn = document.getElementById("saveStaffBtn");
    btn.disabled = true;
    btn.innerText = "Saving...";

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

    btn.disabled = false;
    btn.innerText = "Create Staff";

    if (!result) return;

    document.getElementById("full_name").value = "";
    document.getElementById("staff_username").value = "";
    document.getElementById("staff_password").value = "";

    loadStaff();
}

// ================= LOAD STAFF =================
async function loadStaff() {
    const staff = await safeFetch(`${API_BASE}/admin/staff`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!staff) return;

    // ---------- STAFF TABLE ----------
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

    // ---------- STAFF REPORT DROPDOWN ----------
    const staffSelect = document.getElementById("staffReportSelect");
    if (staffSelect) {
        staffSelect.innerHTML = staff
            .filter(s => s.is_active)
            .map(s => `<option value="${s.id}">${s.full_name}</option>`)
            .join("");

        if (!staffSelect.innerHTML) {
            staffSelect.innerHTML = `<option disabled selected>No active staff</option>`;
        }
    }
}

// ================= ACTIVATE / DEACTIVATE STAFF =================
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

// ================= LOAD SBU REPORT (WITH STAFF BREAKDOWN) =================
async function loadReport() {
    const sbuSelect = document.getElementById("reportSBU");
    const sbuId = sbuSelect.value;
    const sbuName = sbuSelect.selectedOptions[0]?.text || "SBU";
    const period = document.getElementById("reportPeriod").value;
    const date = document.getElementById("reportDate").value;

    if (!sbuId || !date) {
        alert("Select SBU and date");
        return;
    }

    const data = await safeFetch(
        `${API_BASE}/admin/sbu-report?sbu_id=${sbuId}&period=${period}&report_date=${date}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!data) return;

    const {
        total_sales = 0,
        total_expenses = 0,
        net_profit = 0,
        performance_percent = 0,
        staff_breakdown = []
    } = data;

    let html = `
        <h4>${sbuName} — ${period} Report</h4>
        <p>Total Sales: ₦${total_sales.toLocaleString()}</p>
        <p>Total Expenses: ₦${total_expenses.toLocaleString()}</p>
        <p>Net Profit: ₦${net_profit.toLocaleString()}</p>
        <p>Performance: ${performance_percent}%</p>
    `;

    if (staff_breakdown.length) {
        html += `
            <h5>Staff Contributions</h5>
            <table>
                <tr>
                    <th>Staff</th>
                    <th>Sales</th>
                    <th>Expenses</th>
                    <th>Net</th>
                </tr>
        `;

        staff_breakdown.forEach(s => {
            html += `
                <tr>
                    <td>${s.staff_name}</td>
                    <td>₦${(s.total_sales ?? 0).toLocaleString()}</td>
                    <td>₦${(s.total_expenses ?? 0).toLocaleString()}</td>
                    <td>₦${(s.net_profit ?? 0).toLocaleString()}</td>
                </tr>
            `;
        });

        html += `</table>`;
    }

    document.getElementById("reportResult").innerHTML = html;
}

// ================= LOAD AUDIT LOGS =================
async function loadAuditLogs() {
    const container = document.getElementById("auditLog");
    if (!container) return;

    const logs = await safeFetch(`${API_BASE}/admin/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!logs || !logs.length) {
        container.innerHTML = "<p>No activity yet</p>";
        return;
    }

    container.innerHTML = logs.map(l => {
        const time = l.time ? new Date(l.time).toLocaleString() : "Unknown time";
        return `<p><strong>${l.staff}</strong> — ${l.action} (${time})</p>`;
    }).join("");
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
    loadSBUs();
    loadStaff();
    loadAuditLogs();

    document.getElementById("saveStaffBtn").onclick = createStaff;
    document.getElementById("loadReportBtn").onclick = loadReport;
});
