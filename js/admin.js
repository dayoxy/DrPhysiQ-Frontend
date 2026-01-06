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

    // Display SBU summary
    const output = document.getElementById("output");
    if (output) {
        output.innerHTML = sbus
            .map(
                s =>
                    `<p><strong>${s.name}</strong> — ₦${s.daily_budget.toLocaleString()}</p>`
            )
            .join("");
    }

    // Populate selects
    const sbuSelect = document.getElementById("sbuSelect");
    const reportSBU = document.getElementById("reportSBU");

    if (sbuSelect) {
        sbuSelect.innerHTML = sbus
            .map(s => `<option value="${s.id}">${s.name}</option>`)
            .join("");
    }

    if (reportSBU) {
        reportSBU.innerHTML = sbus
            .map(s => `<option value="${s.id}">${s.name}</option>`)
            .join("");
    }
}

// ================= CREATE STAFF =================
async function createStaff() {
    const full_name = document.getElementById("full_name")?.value.trim();
    const username = document.getElementById("staff_username")?.value.trim();
    const password = document.getElementById("staff_password")?.value;
    const sbu_id = document.getElementById("sbuSelect")?.value;

    if (!full_name || !username || !password || !sbu_id) {
        showGlobalError("Please fill all staff fields");
        return;
    }

    const btn = document.getElementById("saveStaffBtn");
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Saving...";
    }

    const res = await apiFetch(`${API_BASE}/admin/create-staff`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            full_name,
            username,
            password,
            department_id: sbu_id
        })
    });

    if (btn) {
        btn.disabled = false;
        btn.innerText = "Create Staff";
    }

    if (!res) return;

    loadStaff();

    document.getElementById("full_name").value = "";
    document.getElementById("staff_username").value = "";
    document.getElementById("staff_password").value = "";
}

// ================= LOAD STAFF =================
async function loadStaff() {
    const res = await apiFetch(`${API_BASE}/admin/staff`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!res) return;

    const staff = await res.json();
    const tbody = document.getElementById("staffList");
    if (!tbody) return;

    tbody.innerHTML = "";

    staff.forEach(s => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${s.full_name}</td>
            <td>${s.username}</td>
            <td>
                <span class="status-pill ${
                    s.is_active ? "status-good" : "status-bad"
                }">
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
}

// ================= ACTIVATE / DEACTIVATE =================
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

// ================= LOAD REPORT =================
async function loadReport() {
    const sbuId = document.getElementById("reportSBU")?.value;
    const period = document.getElementById("reportPeriod")?.value;
    const date = document.getElementById("reportDate")?.value;

    if (!sbuId || !date) {
        showGlobalError("Select SBU and date");
        return;
    }

    const btn = document.getElementById("loadReportBtn");
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Loading...";
    }

    const res = await apiFetch(
        `${API_BASE}/admin/sbu-report?sbu_id=${sbuId}&period=${period}&report_date=${date}`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (btn) {
        btn.disabled = false;
        btn.innerText = "Load Report";
    }

    if (!res) return;

    const data = await res.json();

    document.getElementById("reportResult").innerHTML = `
        <h4>${data.sbu.name}</h4>
        <p>Total Sales: ₦${data.total_sales.toLocaleString()}</p>
        <p>Total Expenses: ₦${data.total_expenses?.toLocaleString() ?? data.expenses?.total?.toLocaleString()}</p>
        <p>Net Profit: ₦${data.net_profit.toLocaleString()}</p>
        <p>Performance: ${data.performance_percent}%</p>
    `;
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
    loadSBUs();
    loadStaff();

    const saveStaffBtn = document.getElementById("saveStaffBtn");
    if (saveStaffBtn) saveStaffBtn.onclick = createStaff;

    const loadReportBtn = document.getElementById("loadReportBtn");
    if (loadReportBtn) loadReportBtn.onclick = loadReport;
});
