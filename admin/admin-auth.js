export function requireAdmin(allowedRoles) {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const username = localStorage.getItem("username");

    if (!token || !allowedRoles.includes(role)) {
        localStorage.clear();
        window.location.href = "../index.html";
    }

    return { token, role, username };
}
