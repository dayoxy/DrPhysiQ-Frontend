// js/staff.js
console.log("staff.js loaded");

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

        document.getElementById("staffName").innerText = username;
        document.getElementById("sbuName").innerText = sbu.name;

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

        const performanceEl = document.getElementById("performanceStatus");
        if (performanceEl) {
            performanceEl.innerText = status;
            performanceEl.className = "status-pill";

            if (status === "Excellent") {
                performanceEl.classList.add("status-good");
            } else if (status === "warning") {
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

// ---------- SAVE SALES (🔥 THIS WAS MISSING) ----------
function initSalesSave() {
    const btn = document.getElementById("saveSalesBtn");
    if (!btn) return;

    btn.addEventListener("click", async () => {
        const amount = Number(document.getElementById("salesInput").value);
        const date = document.getElementById("salesDate").value;
        const notes = document.getElementById("salesNotes").value || "";

        if (!amou
