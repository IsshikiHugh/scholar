const defaultTheme = "theme-iro-silent"

function setThemeToCookie(value) {
    const date = new Date();
    date.setTime(date.getTime() + 365 * 24 * 60 * 60 * 1000);
    document.cookie = `IRO_THEME=${value};expires=${date.toUTCString()};path=/`;
}

function getThemeFromCookie() {
    const cookies = document.cookie.split("; ");
    for (const cookie of cookies) {
        const [key, value] = cookie.split("=");
        if (key === "IRO_THEME") return value;
    }
    return defaultTheme;
}

function switchTheme(theme) {
    // Remove previous theme.
    document.body.classList.forEach(className => {
        if (className.startsWith("theme-iro")) {
            document.body.classList.remove(className);
        }
    });
    // Add new theme.
    document.body.classList.add(theme);
    // Save theme to cookie.
    setThemeToCookie(theme);
};

function initTheme() {
    const theme = getThemeFromCookie();
    switchTheme(theme);
}