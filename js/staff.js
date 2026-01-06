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
    if (!data) return;

    const sbu = data.sbu;
    const fixed = data.fixed_costs || {};
    const variable = data.variable_costs || {};

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

    // ---- Performance status ----
    const perfEl = document.getElementById("performanceStatus");
    if (perfEl) {
        perfEl.innerText = data.performance_status;
        perfEl.className = "status-pill";

        if (data.performance_status === "Excellent") {
            perfEl.classList.add("status-good");
        } else if (data.performance_status === "warning") {
            perfEl.classList.add("status-warn");
        } else {
            perfEl.classList.add("status-bad");
        }
    }

    // ---- Fixed costs ----
    document.getElementById("personnel").innerText =
        (fixed.personnel_cost || 0).toLocaleString();
    document.getElementById("rent").innerText =
        (fixed.rent || 0).toLocaleString();
    document.getElementById("electricity").innerText =
        (fixed.electricity || 0).toLocaleString();

    // ---- Variable costs ----
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

        const res = await apiFetch(`${API_BASE}/staff/sales`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ amount, sale_date, notes })
        });

        btn.disabled = false;
        btn.innerText = "Save Sales";

        if (!res) return;

        document.getElementById("salesInput").value = "";
        loadStaffDashboard();
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

        const res = await apiFetch(`${API_BASE}/staff/expenses`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ category, amount, date, notes })
        });

        btn.disabled = false;
        btn.innerText = "Save Expense";

        if (!res) return;

        document.getElementById("expenseAmount").value = "";
        loadStaffDashboard();
    };
}

// ================= CHANGE PASSWORD =================
async function changePassword() {
    const old_password = document.getElementById("oldPassword").value;
    const new_password = document.getElementById("newPassword").value;

    if (!old_password || !new_password) {
        alert("Fill all fields");
        return;
    }

    const res = await apiFetch(`${API_BASE}/staff/change-password`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ old_password, new_password })
    });

    if (res) {
        alert("Password changed successfully");
        document.getElementById("oldPassword").value = "";
        document.getElementById("newPassword").value = "";
    }
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
    setTodayDate();
    loadStaffDashboard();
    initSalesSave();
    initExpenseSave();

    const changeBtn = document.getElementById("changePasswordBtn");
    if (changeBtn) changeBtn.onclick = changePassword;
});
