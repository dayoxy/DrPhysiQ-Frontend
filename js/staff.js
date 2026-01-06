// js/staff.js
console.log("staff.js loaded");

// ---------- GLOBAL ERROR HANDLER ----------
function showGlobalError(message) {
    const banner = document.getElementById("globalError");
    const text = document.getElementById("globalErrorText");

    if (!banner || !text) {
        alert(message); // fallback
        return;
    }

    text.innerText = message;
    banner.classList.remove("hidden");
}

function hideGlobalError() {
    const banner = document.getElementById("globalError");
    if (banner) banner.classList.add("hidden");
}


// ---------- AUTH GUARD ----------
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
const username = localStorage.getItem("username");

if (!token || role !== "staff") {
    window.location.href = "index.html";
}

// ---------- LOGOUT ----------
function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}
window.logout = logout;

// ---------- LOAD STAFF DASHBOARD ----------
async function loadStaffDashboard() {
    try {
        const res = await apifetch(`${API_BASE}/staff/my-sbu`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!res.ok) throw new Error("Failed to load staff dashboard");

        const data = await res.json();
        console.log("Staff SBU data:", data);

        const sbu = data.sbu;
        const fixed = data.fixed_costs || {};
        const variable = data.variable_costs || {};

        document.getElementById("staffName").innerText = username;
        document.getElementById("sbuName").innerText = sbu.name;
        document.getElementById("dailyBudget").innerText =
            sbu.daily_budget.toLocaleString();

        document.getElementById("salesToday").innerText =
            (data.sales_today || 0).toLocaleString();

        document.getElementById("totalExpenses").innerText =
            (data.total_expenses || 0).toLocaleString();

        document.getElementById("netProfit").innerText =
            (data.net_profit || 0).toLocaleString();

        document.getElementById("performance").innerText =
            (data.performance_percent || 0) + "%";

        const performanceEl = document.getElementById("performanceStatus");
        if (performanceEl) {
            performanceEl.innerText = data.performance_status;
            performanceEl.className = "status-pill";

            if (data.performance_status === "Excellent") {
                performanceEl.classList.add("status-good");
            } else if (data.performance_status === "warning") {
                performanceEl.classList.add("status-warn");
            } else {
                performanceEl.classList.add("status-bad");
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

    } catch (err) {
        console.error(err);
        alert("Error loading staff dashboard");
    }
}

// ---------- SAVE SALES ----------
function initSalesSave() {
    const btn = document.getElementById("saveSalesBtn");
    if (!btn) return;

    btn.addEventListener("click", async () => {
        const amount = Number(document.getElementById("salesInput").value);
        const sale_date = document.getElementById("salesDate").value;
        const notes = document.getElementById("salesNotes")?.value || "";

        if (!amount || amount <= 0 || !sale_date) {
            alert("Enter valid sales amount and date");
            return;
        }

        const res = await fetch(`${API_BASE}/staff/sales`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ amount, sale_date, notes })
        });

        if (!res.ok) {
            const err = await res.json();
            alert(err.detail || "Failed to save sales");
            return;
        }

        alert("Sales saved successfully");
        document.getElementById("salesInput").value = "";
        loadStaffDashboard();
    });
}

// ---------- SAVE EXPENSE ----------
function initExpenseSave() {
    const btn = document.getElementById("saveExpenseBtn");
    if (!btn) return;

    btn.addEventListener("click", async () => {
        const category = document.getElementById("expenseCategory").value;
        const amount = Number(document.getElementById("expenseAmount").value);
        const date = document.getElementById("expenseDate").value;
        const notes = document.getElementById("expenseNotes")?.value || "";

        if (!amount || amount <= 0 || !date) {
            alert("Enter valid expense details");
            return;
        }

        const res = await apifetch(`${API_BASE}/staff/expenses`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
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
        loadExpenseHistory();
    });
}

// ---------- AUTO-FILL TODAY'S DATE ----------
function setTodayDate() {
    const today = new Date().toISOString().split("T")[0];

    const salesDate = document.getElementById("salesDate");
    const expenseDate = document.getElementById("expenseDate");

    if (salesDate) salesDate.value = today;
    if (expenseDate) expenseDate.value = today;
}

// ---------- EXPENSE HISTORY ----------
async function loadExpenseHistory() {
    try {
        const res = await fetch(`${API_BASE}/staff/expenses/history`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!res.ok) return;

        const data = await res.json();
        const tbody = document.getElementById("expenseHistoryBody");
        tbody.innerHTML = "";

        Object.entries(data).forEach(([date, row]) => {
            const total =
                (row.consumables || 0) +
                (row.general_expenses || 0) +
                (row.utilities || 0) +
                (row.miscellaneous || 0);

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${date}</td>
                <td>${row.consumables || 0}</td>
                <td>${row.general_expenses || 0}</td>
                <td>${row.utilities || 0}</td>
                <td>${row.miscellaneous || 0}</td>
                <td><strong>${total}</strong></td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Failed to load expense history", err);
    }
}

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
    setTodayDate();
    loadStaffDashboard();
    initSalesSave();
    initExpenseSave();
    loadExpenseHistory();
});
