const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        const res = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        if (!res.ok) {
            alert("Invalid login");
            return;
        }

        const data = await res.json();
        
        // Save auth data
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("role", data.role);
        localStorage.setItem("username", data.username);
        localStorage.setItem("must_change_password", data.must_change_password);

        // 🔐 Force password change first (ALL ROLES)
        if (data.must_change_password) {
            window.location.href = "staff.html";
            return;
        }

        // ✅ ROLE-BASED ROUTING
        if (data.role === "ops_admin" || data.role === "super_admin") {
            window.location.href = "admin/ops-admin.html";
        } else if (data.role === "accountant_admin") {
            window.location.href = "admin/accountant-admin.html";
        } else if (data.role === "staff") {
            window.location.href = "staff.html";
        } else {
            showGlobalError("Unknown role. Contact admin.");
        }

function showGlobalError(message) {
    const banner = document.getElementById("globalError");
    const text = document.getElementById("globalErrorText");

    if (!banner || !text) return;

    text.innerText = message;
    banner.classList.remove("hidden");
}

function hideGlobalError() {
    const banner = document.getElementById("globalError");
    if (banner) banner.classList.add("hidden");
}

window.showGlobalError = showGlobalError;
window.hideGlobalError = hideGlobalError;

async function apiFetch(url, options = {}) {
    try {
        const res = await fetch(url, options);

        // Unauthorized
        if (res.status === 401) {
            showGlobalError("Session expired. Please log in again.");
            localStorage.clear();
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1500);
            return null;
        }

        // Forbidden
        if (res.status === 403) {
            showGlobalError("You are not allowed to perform this action.");
            return null;
        }

        // Other errors
        if (!res.ok) {
            let err;
            try {
                err = await res.json();
            } catch {
                err = {};
            }
            showGlobalError(err.detail || "Server error occurred");
            return null;
        }

        // ✅ ALWAYS return parsed JSON
        return await res.json();

    } catch (err) {
        showGlobalError("Network error. Check your connection.");
        return null;
    }
}

function getToken() {
    return localStorage.getItem("token");
}

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

document.getElementById("showPassword")?.addEventListener("change", e => {
    const input = document.getElementById("password");
    input.type = e.target.checked ? "text" : "password";
});

