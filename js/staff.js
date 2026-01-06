console.log("staff.js loaded");

// ================= AUTH GUARD =================
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
const username = localStorage.getItem("username");

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

// ================= PASSWORD RESET ENFORCEMENT =================
function enforcePasswordReset() {
    document.body.classList.add("force-password-reset");

    document.querySelectorAll(".panel").forEach(panel => {
        if (!panel.classList.contains("password-panel")) {
            panel.style.display = "none";
        }
    });
}

// ================= AUTO DATE =================
function setTodayDate() {
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("salesDate")?.value = today;
    document.getElementById("expenseDate")?.value = today;
}

// ================= DASHBOARD =================
async function loadStaffDashboard() {
    const data = await apiFetch(`${API_BASE}/staff/my-sbu`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!data) return;

    if (!data.sbu) {
        showGlobalError("Your account is not linked to an SBU.");
        return;
    }

    const { sbu, fixed_costs = {}, variable_costs = {} } = data;

    document.getElementById("staffName").innerText = username;
    document.getElementById("sbuName").innerText = sbu.name;

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

    const statusEl = document.getElementById("performanceStatus");
    if (statusEl) {
        statusEl.innerText = data.performance_status || "-";
        statusEl.className = "status-pill";

        if (data.performance_status === "Excellent") statusEl.classList.add("status-good");
        else if (data.performance_status === "warning") statusEl.classList.add("status-warn");
        else statusEl.classList.add("status-bad");
    }

    document.getElementById("personnel").innerText =
        (fixed_costs.personnel_cost || 0).toLocaleString();
    document.getElementById("rent").innerText =
        (fixed_costs.rent || 0).toLocaleString();
    document.getElementById("electricity").innerText =
        (fixed_costs.electricity || 0).toLocaleString();

    document.getElementById("consumables").innerText =
        (variable_costs.consumables || 0).toLocaleString();
    document.getElementById("generalExpenses").innerText =
        (variable_costs.general_expenses || 0).toLocaleString();
    document.getElementById("utilities").innerText =
        (variable_costs.utilities || 0).toLocaleString();
    document.getElementById("miscellaneous").innerText =
        (variable_costs.miscellaneous || 0).toLocaleString();
}

// ================= SALES =================
function initSalesSave() {
    const btn = document.getElementById("saveSalesBtn");
    if (!btn) return;

    btn.onclick = async () => {
        const amount = Number(document.getElementById("salesInput").value);
        const sale_date = document.getElementById("salesDate").value;
        const notes = document.getElementById("salesNotes")?.value || "";

        if (!amount || !sale_date) {
            showGlobalError("Enter valid sales details");
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

        if (ok) loadStaffDashboard();
    };
}

// ================= EXPENSE =================
function initExpenseSave() {
    const btn = document.getElementById("saveExpenseBtn");
    if (!btn) return;

    btn.onclick = async () => {
        const category = document.getElementById("expenseCategory").value;
        const amount = Number(document.getElementById("expenseAmount").value);
        const date = document.getElementById("expenseDate").value;
        const notes = document.getElementById("expenseNotes")?.value || "";

        if (!amount || !date) {
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

        if (ok) loadStaffDashboard();
    };
}

// ================= CHANGE PASSWORD =================
async function changePassword() {
    const old_password = document.getElementById("oldPassword").value;
    const new_password = document.getElementById("newPassword").value;

    if (!old_password || !new_password) {
        showGlobalError("Fill all fields");
        return;
    }

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

    localStorage.setItem("must_change_password", "false");
    document.body.classList.remove("force-password-reset");
    document.querySelectorAll(".panel").forEach(p => p.style.display = "block");

    loadStaffDashboard();
}

// ================= AUDIT LOG =================
async function loadStaffAuditLogs() {
    const container = document.getElementById("staffAuditLog");
    if (!container) return;

    const logs = await apiFetch(`${API_BASE}/staff/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!logs) return;

    container.innerHTML = logs.length
        ? logs.map(l =>
            `<p>${l.action} — ${new Date(l.time).toLocaleString()}</p>`
        ).join("")
        : "<p class='muted'>No activity yet</p>";
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", async () => {
    setTodayDate();

    const mustChange = localStorage.getItem("must_change_password") === "true";

    if (mustChange) {
        enforcePasswordReset();
        document.getElementById("changePasswordBtn")?.addEventListener("click", changePassword);
        return;
    }

    await loadStaffDashboard();
    loadStaffAuditLogs();
    initSalesSave();
    initExpenseSave();

    document.getElementById("changePasswordBtn")?.addEventListener("click", changePassword);
});
