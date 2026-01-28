import { requireAdmin } from "./admin-auth.js";

const { token, username } = requireAdmin([
    "accountant_admin",
    "ops_admin",
    "super_admin"
]);

document.getElementById("adminUser").innerText = username;

async function loadSBUs() {
    const res = await fetch(`${API_BASE}/admin/sbus`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const sbus = await res.json();
    document.getElementById("reportSBU").innerHTML =
        sbus.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
}

loadSBUs();
loadSBUReport();
loadRangeSBUReport();
loadStaffSBUReport();
