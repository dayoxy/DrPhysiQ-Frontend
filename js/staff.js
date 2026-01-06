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

// ================= PASSWORD RESET =================
function enforcePasswordReset() {
    document.body.classList.add("force-password-reset");

    document.querySelectorAll(".panel").forEach(panel => {
        panel.style.display = panel.classList.contains("password-panel")
            ? "block"
            : "none";
    });
}

// ================= AUTO DATE =================
function setTodayDate() {
    const today = new Date().toISOString().split("T")[0];
    const sd = document.getElementById("salesDate");
    const ed = document.getElementById("expenseDate");
    if (sd) sd.value = today;
    if (ed) ed.value = today;
}

// ================= DASHBOARD =================
async function loadStaffDashboard() {
    const res = await apiFetch(`${API_BASE}/staff/my-sbu`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!res) return;

    const data = await res.json();
    console.log("Dashboard data:", data);

    if (!data.sbu) {
        showGlobalError("Your account is not linked to an SBU.");
        return;
    }

    const sbu = data.sbu;
    const fixed = data.fixed_costs || {};
    const variable = data.variable_costs || {};

    document.getElementById("staffName").innerText = username;
    document.getElementById("sbuName").innerText = sbu.name || "-";
    document.getElementById("dailyBudget").innerText = (sbu.daily_budget || 0).toLocaleString();
    document.getElementById("salesToday").innerText = (data.sales_today || 0).toLocaleString();
    document.getElementById("totalExpenses").innerText = (data.total_expenses || 0).toLocaleString();
    document.getElementById("netProfit").innerText = (data.net_profit || 0).toLocaleString();
    document.getElementById("performance").innerText = (data.performance_percent || 0) + "%";

    const statusEl = document.getElementById("performanceStatus");
    if (statusEl) {
        statusEl.innerText = data.performance_status || "-";
        statusEl.className = "status-pill";
        if (data.performance_status === "Excellent") statusEl.classList.add("status-good");
        else if (data.performance_status === "warning") statusEl.classList.add("status-warn");
        else statusEl.classList.add("status-bad");
    }

    document.getElementById("personnel").innerText = (fixed.personnel_cost || 0).toLocaleString();
    document.getElementById("rent").innerText = (fixed.rent || 0).toLocaleString();
    document.getElementById("electricity").innerText = (fixed.electricity || 0).toLocaleString();

    document.getElementById("consumables").innerText = (variable.consumables || 0).toLocaleString();
    document.getElementById("generalExpenses").innerText = (variable.general_expenses || 0).toLocaleString();
    document.getElementById("utilities").innerText = (variable.utilities || 0).toLocaleString();
    document.getElementById("miscellaneous").innerText = (variable.miscellaneous || 0).toLocaleString();
}

// ================= PASSWORD CHANGE =================
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

// ================= INIT =================
document.addEventListener("DOMContentLoaded", async () => {
    console.log("staff.js DOMContentLoaded");

    setTodayDate();

    const mustChange = localStorage.getItem("must_change_password") === "true";
    if (mustChange) {
        enforcePasswordReset();
        document.getElementById("changePasswordBtn")?.addEventListener("click", changePassword);
        return;
    }

    await loadStaffDashboard();
    document.getElementById("changePasswordBtn")?.addEventListener("click", changePassword);
});
