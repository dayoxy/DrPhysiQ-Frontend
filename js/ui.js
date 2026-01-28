function show(id) {
    document.getElementById(id)?.classList.remove("hidden");
}

function hide(id) {
    document.getElementById(id)?.classList.add("hidden");
}

function showGlobalError(message) {
    const banner = document.getElementById("globalError");
    const text = document.getElementById("globalErrorText");
    if (!banner || !text) return;

    text.innerText = message;
    banner.classList.remove("hidden");
}

function hideGlobalError() {
    document.getElementById("globalError")?.classList.add("hidden");
}

function logout() {
    localStorage.clear();
    window.location.href = "../index.html";
}
