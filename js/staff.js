// js/staff.js
console.log("staff.js loaded");

// ================= AUTH GUARD =================
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
const username = localStorage.getItem("username");

if (!token || role !== "staff") {
    window.location.href = "index.html";
}

// ================= LOGOUT =================
function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}
window.logout = logout;

// ---------- LOAD STAFF DASHBOARD ----------
async function loadStaffDashboard() {
    try {
        const res = await fetch(`${API_BASE}/staff/my-sbu`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!res.ok) {
            throw new Error("Failed to load staff dashboard");
        }

        const data = await res.json();
        console.log("Staff SBU data:", data);

        const sbu = data.sbu;
        const salesToday = data.sales_today || 0;
        const fixed = data.fixed_costs || {};
        const variable = data.variable_costs || {};
        const netProfit = data.net_profit || 0;
        const performance = data.performance_percent || 0;
        const status = data.performance_status;

        // ---------- HEADER ----------
        document.getElementById("staffName").innerText = username;
        document.getElementById("sbuName").innerText = sbu.name;

        // ---------- KPI ----------
        document.getElementById("dailyBudget").innerText =
            sbu.daily_budget.toLocaleString();

        document.getElementById("salesToday").innerText =
            salesToday.toLocaleString();

        document.getElementById("totalExpenses").innerText =
            data.total_expenses.toLocaleString();

        document.getElementById("netProfit").innerText =
            netProfit.toLocaleString();

        document.getElementById("performance").innerText =
            performance + "%";

        // ---------- PERFORMANCE STATUS (FIXED CASE ISSUE) ----------
        const performanceEl = document.getElementById("performanceStatus");
        performanceEl.innerText = status;
        performanceEl.className = "status-pill";

        if (status === "Excellent") {
            performanceEl.classList.add("status-good");
        } else if (status === "warning") {
            performanceEl.classList.add("status-warn");
        } else {
            performanceEl.classList.add("status-bad");
        }

        // ---------- FIXED COSTS ----------
        document.getElementById("personnel").innerText =
            (fixed.personnel_cost || 0).toLocaleString();

        document.getElementById("rent").innerText =
            (fixed.rent || 0).toLocaleString();

        document.getElementById("electricity").innerText =
            (fixed.electricity || 0).toLocaleString();

        // ---------- VARIABLE COSTS ----------
        document.getElementById("consumables").innerText =
            (variable.consumables || 0).toLocaleString();

        document.getElementById("generalExpenses").innerText =
            (variable.general_expenses || 0).toLocaleString();

        document.getElementById("miscellaneous").innerText =
            (variable.miscellaneous || 0).toLocaleString();

    } catch (err) {
        console.error(err);
        alert("Error loading staff dashboard");
    }
}

// ---------- SAVE STAFF EXPENSE ----------
function initExpenseSave() {
    const btn = document.getElementById("saveExpenseBtn");
    if (!btn) return;

    btn.addEventListener("click", async () => {
        const category = document.getElementById("expenseCategory").value;
        const amount = Number(document.getElementById("expenseAmount").value);
        const date = document.getElementById("expenseDate").value;
        const notes = document.getElementById("expenseNotes")?.value || "";

        if (!amount || amount <= 0) {
            alert("Enter a valid amount");
            return;
        }

        const res = await fetch(`${API_BASE}/staff/expenses`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ category, amount, date, notes })
        });

        if (!res.ok) {
            const err = await res.json();
            alert(err.detail || "Failed to save expense");
            return;
        }

        alert("Expense saved successfully");
        document.getElementById("expenseAmount").value = "";

        loadStaffDashboard();
    });
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", async () => {
    console.log("staff.js DOMContentLoaded");

    setTodayDate();

    if (localStorage.getItem("must_change_password") === "true") {
        enforcePasswordReset();
        document
            .getElementById("changePasswordBtn")
            ?.addEventListener("click", changePassword);
        document.body.classList.add("ready");
        return;
    }

    await loadStaffDashboard();
    loadExpenseHistory();
    loadStaffAuditLogs();

    initSalesSave();
    initExpenseSave();

    document.body.classList.add("ready");
});
