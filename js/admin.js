console.log("admin.js loaded");

// ================= AUTH GUARD =================
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
const username = localStorage.getItem("username");

if (!token || role !== "admin") {
    window.location.href = "index.html";
    throw new Error("Unauthorized");
}

// ================= GLOBAL ERROR =================
function showGlobalError(message) {
    const banner = document.getElementById("globalError");
    const text = document.getElementById("globalErrorText");
    text.innerText = message;
    banner.classList.remove("hidden");
    setTimeout(() => banner.classList.add("hidden"), 5000);
}
function hideGlobalError() {
    document.getElementById("globalError").classList.add("hidden");
}
window.hideGlobalError = hideGlobalError;

// ================= HEADER =================
document.getElementById("adminUser").innerText =
    "Logged in as: " + username;

// ================= LOAD SBUs =================
async function loadSBUs() {
    const res = await fetch(`${API_BASE}/admin/sbus`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
        showGlobalError("Failed to load SBUs");
        return;
    }

    const sbus = await res.json();

    const output = document.getElementById("output");
    const reportSBU = document.getElementById("reportSBU");
    const sbuSelect = document.getElementById("sbuSelect");

    if (sbus.length === 0) {
        output.innerHTML = "<p class='empty'>No SBUs created yet</p>";
        return;
    }

    output.innerHTML = sbus
        .map(s => `<p>${s.name} – ₦${s.daily_budget.toLocaleString()}</p>`)
        .join("");

    reportSBU.innerHTML = sbus
        .map(s => `<option value="${s.id}">${s.name}</option>`)
        .join("");

    sbuSelect.innerHTML = sbus
        .map(s => `<option value="${s.id}">${s.name}</option>`)
        .join("");
}

// ================= CREATE STAFF =================
async function createStaff() {
    const payload = {
        full_name: document.getElementById("full_name").value.trim(),
        username: document.getElementById("staff_username").value.trim(),
        password: document.getElementById("staff_password").value,
        sbu_id: document.getElementById("sbuSelect").value
    };

    if (!payload.full_name || !payload.username || !payload.password) {
        showGlobalError("Fill all fields");
        return;
    }

    const res = await fetch(`${API_BASE}/admin/create-staff`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        showGlobalError("Failed to create staff");
        return;
    }

    loadStaff();
}

// ================= LOAD STAFF =================
async function loadStaff() {
    const res = await fetch(`${API_BASE}/admin/staff`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
        alert("Failed to load staff");
        return;
    }

    const staff = await res.json();

    document.getElementById("staffList").innerHTML = staff.map(s => `
        <tr>
            <td>${s.full_name}</td>
            <td>${s.username}</td>
            <td>${s.is_active ? "🟢 Active" : "🔴 Inactive"}</td>
            <td>
                ${
                    s.is_active
                        ? `<button onclick="deactivateStaff('${s.id}')">Deactivate</button>`
                        : `<button onclick="activateStaff('${s.id}')">Activate</button>`
                }
            </td>
        </tr>
    `).join("");
}

// ================= DELETE STAFF =================
async function deactivateStaff(id) {
    if (!confirm("Deactivate this staff?")) return;

    const res = await fetch(`${API_BASE}/admin/staff/${id}/deactivate`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
        alert("Failed to deactivate staff");
        return;
    }

    alert("Staff deactivated");
    loadStaff();
}

async function activateStaff(id) {
    const res = await fetch(`${API_BASE}/admin/staff/${id}/activate`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
        alert("Failed to activate staff");
        return;
    }

    alert("Staff activated");
    loadStaff();
}

// ================= REPORT + CHART =================
let chart;

async function loadReport() {
    const sbuId = document.getElementById("reportSBU").value;
    const period = document.getElementById("reportPeriod").value;
    const date = document.getElementById("reportDate").value;

    if (!sbuId || !date) {
        showGlobalError("Select SBU and date");
        return;
    }

    const res = await fetch(
        `${API_BASE}/admin/sbu-report?sbu_id=${sbuId}&period=${period}&report_date=${date}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
        showGlobalError("Failed to load report");
        return;
    }

    const data = await res.json();

    document.getElementById("reportResult").innerHTML = `
        <p>Total Sales: ₦${data.total_sales.toLocaleString()}</p>
        <p>Total Expenses: ₦${data.total_expenses.toLocaleString()}</p>
        <p>Net Profit: ₦${data.net_profit.toLocaleString()}</p>
        <p>Performance: ${data.performance_percent}%</p>
    `;

    renderChart(data.total_sales, data.total_expenses);
}

function renderChart(sales, expenses) {
    const ctx = document.getElementById("chart");
    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Sales", "Expenses"],
            datasets: [{
                data: [sales, expenses],
                backgroundColor: ["#4caf50", "#f44336"]
            }]
        }
    });
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
    loadSBUs();
    loadStaff();

    const saveStaffBtn = document.getElementById("saveStaffBtn");
    if (saveStaffBtn) {
        saveStaffBtn.onclick = createStaff;
    }

    const loadReportBtn = document.getElementById("loadReportBtn");
    if (loadReportBtn) {
        loadReportBtn.onclick = loadReport;
    }
});


// ================= LOGOUT =================
function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}
window.logout = logout;
