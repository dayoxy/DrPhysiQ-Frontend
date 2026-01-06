console.log("staff.js loaded");

// ================= AUTH GUARD =================
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
const username = localStorage.getItem("username");
const mustChangePassword =
    localStorage.getItem("must_change_password") === "true";

if (!token || role !== "staff") {
    localStorage.clear();
    window.location.href = "index.html";
}

// ================= LOGOUT =================
function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}
window.logout = logout;

// ================= FORCE PASSWORD RESET =================
function enforcePasswordReset() {
    if (!mustChangePassword) return;

    document.body.classList.add("force-password-reset");

    // Hide all panels except password panel
    const panels = document.querySelectorAll(".panel");
    panels.forEach(panel => {
        if (!panel.classList.contains("password-panel")) {
            panel.style.display = "none";
        }
    });
}

// ================= AUTO-FILL TODAY =================
function setTodayDate() {
    const today = new Date().toISOString().split("T")[0];

    const salesDate = document.getElementById("salesDate");
    const expenseDate = document.getElementById("expenseDate");

    if (salesDate) salesDate.value = today;
    if (expenseDate) expenseDate.value = today;
}

// ================= LOAD STAFF DASHBOARD =================
async function loadStaffDashboard() {
    const data = await apiFetch(`${API_BASE}/staff/my-sbu`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    console.log("Staff dashboard data:", data);

    if (!data) return;

    if (!data.sbu || !data.sbu.id) {
        showGlobalError("Your account is not linked to an SBU");
        return;
    }


    const sbu = data.sbu;
    const fixed = data.fixed_costs || {};
    const variable = data.variable_costs || {};

    document.getElementById("staffName").innerText = username;
    document.getElementById("sbuName").innerText = sbu.name ?? "-";

    document.getElementById("dailyBudget").innerText =
        (sbu.daily_budget || 0).toLocaleString();

    document.getElementById("salesToday").innerText =
        (data.sales_today || 0).toLocaleString();

    document.getElementById("totalExpenses").innerText =
        (data.total_expenses || 0).toLocaleString();

    document.getElementById("netProfit").innerText =
        (data.net_profit || 0).toLocaleString();

    document.getElementById("performance").innerText =
        (data.performance_percent || 0) + "%";

    const perfEl = document.getElementById("performanceStatus");
    if (perfEl) {
        perfEl.innerText = data.performance_status || "-";
        perfEl.className = "status-pill";

        if (data.performance_status === "Excellent") {
            perfEl.classList.add("status-good");
        } else if (data.performance_status === "warning") {
            perfEl.classList.add("status-warn");
        } else {
            perfEl.classList.add("status-bad");
        }
    }

    document.getElementById("personnel").innerText =
        (fixed.personnel_cost || 0).toLocaleString();
    document.getElementById("rent").innerText =
        (fixed.rent || 0).toLocaleString();
    document.getElementById("electricity").innerText =
        (fixed.electricity || 0).toLocaleString();

    document.getElementById("consumables").innerText =
        (variable.consumables || 0).toLocaleString();
    document.getElementById("generalExpenses").innerText =
        (variable.general_expenses || 0).toLocaleString();
    document.getElementById("utilities").innerText =
        (variable.utilities || 0).toLocaleString();
    document.getElementById("miscellaneous").innerText =
        (variable.miscellaneous || 0).toLocaleString();
}

// ================= SAVE SALES =================
function initSalesSave() {
    const btn = document.getElementById("saveSalesBtn");
    if (!btn) return;

    btn.onclick = async () => {
        const amount = Number(document.getElementById("salesInput").value);
        const sale_date = document.getElementById("salesDate").value;
        const notes = document.getElementById("salesNotes")?.value || "";

        if (!amount || amount <= 0 || !sale_date) {
            showGlobalError("Enter valid sales amount and date");
            return;
        }

        btn.disabled = true;
        btn.innerText = "Saving...";

        const ok = await apiFetch(`${API_BASE}/staff/sales`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ amount, sale_date, notes })
        });

        btn.disabled = false;
        btn.innerText = "Save Sales";

        if (ok) {
            document.getElementById("salesInput").value = "";
            loadStaffDashboard();
            loadStaffAuditLogs();
        }
    };
}

// ================= SAVE EXPENSE =================
function initExpenseSave() {
    const btn = document.getElementById("saveExpenseBtn");
    if (!btn) return;

    btn.onclick = async () => {
        const category = document.getElementById("expenseCategory").value;
        const amount = Number(document.getElementById("expenseAmount").value);
        const date = document.getElementById("expenseDate").value;
        const notes = document.getElementById("expenseNotes")?.value || "";

        if (!amount || amount <= 0 || !date) {
            showGlobalError("Enter valid expense details");
            return;
        }

        btn.disabled = true;
        btn.innerText = "Saving...";

        const ok = await apiFetch(`${API_BASE}/staff/expenses`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ category, amount, date, notes })
        });

        btn.disabled = false;
        btn.innerText = "Save Expense";

        if (ok) {
            document.getElementById("expenseAmount").value = "";
            loadStaffDashboard();
            loadStaffAuditLogs();
        }
    };
}

// ================= STAFF REPORT =================
async function loadMySBUReport() {
    const period = document.getElementById("staffReportPeriod").value;
    const date = document.getElementById("staffReportDate").value;

    if (!date) {
        showGlobalError("Select a date");
        return;
    }

    const data = await apiFetch(
        `${API_BASE}/staff/my-sbu/report?period=${period}&report_date=${date}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!data) return;

    document.getElementById("myReportResult").innerHTML = `
        <p><strong>Total Sales:</strong> ₦${data.total_sales.toLocaleString()}</p>
        <p><strong>Total Expenses:</strong> ₦${data.total_expenses.toLocaleString()}</p>
        <p><strong>Net Profit:</strong> ₦${data.net_profit.toLocaleString()}</p>
        <p><strong>Performance:</strong> ${data.performance_percent}%</p>
    `;
}

// ================= CHANGE PASSWORD =================
async function changePassword() {
    const old_password = document.getElementById("oldPassword").value;
    const new_password = document.getElementById("newPassword").value;

    const ok = await apiFetch(`${API_BASE}/staff/change-password`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ old_password, new_password })
    });

    if (!ok) return;

    alert("Password changed successfully");

    // ✅ Only update localStorage ONCE
    localStorage.setItem("must_change_password", "false");

    // ✅ Just hide password panel instead of reload
    document.body.classList.remove("force-password-reset");

    loadStaffDashboard();
}

// ================= STAFF AUDIT LOG =================
async function loadStaffAuditLogs() {
    const container = document.getElementById("staffAuditLog");
    if (!container) return;

    const logs = await apiFetch(`${API_BASE}/staff/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    container.innerHTML = logs?.length
        ? logs
              .map(
                  l =>
                      `<p>${l.action} — ${new Date(
                          l.time
                      ).toLocaleString()}</p>`
              )
              .join("")
        : "<p class='muted'>No activity yet</p>";
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", async () => {
    setTodayDate();

    const mustChange = localStorage.getItem("must_change_password") === "true";

    if (mustChange) {
        enforcePasswordReset();
        return; // ❗ STOP HERE
    }

    await loadStaffDashboard();
    await loadStaffAuditLogs();

    initSalesSave();
    initExpenseSave();

    document.getElementById("changePasswordBtn")?.onclick = changePassword;
    document.getElementById("loadMyReportBtn")?.onclick = loadMySBUReport;
});
