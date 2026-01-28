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
            showGlobalError("Invalid login");
            return;
        }

        const data = await res.json();

        localStorage.setItem("token", data.access_token);
        localStorage.setItem("role", data.role);
        localStorage.setItem("username", data.username);
        localStorage.setItem("must_change_password", data.must_change_password);

        // 🔐 Force password change
        if (data.must_change_password) {
            window.location.href = "staff.html";
            return;
        }

        // ✅ ROLE-BASED REDIRECT
        if (data.role === "ops_admin" || data.role === "super_admin") {
            window.location.href = "admin/ops-admin.html";
        } else if (data.role === "accountant_admin") {
            window.location.href = "admin/accountant-admin.html";
        } else if (data.role === "staff") {
            window.location.href = "staff.html";
        } else {
            showGlobalError("Unknown role");
        }
    });
}

document.getElementById("showPassword")?.addEventListener("change", e => {
    document.getElementById("password").type =
        e.target.checked ? "text" : "password";
});
