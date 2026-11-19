/**
 * Handles login.html and register.html.
 * Requires api.js to be loaded first.
 */
window.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);
  if (registerForm) registerForm.addEventListener("submit", handleRegister);

  const returnTo = getAuthReturnTo();
  const loginLink = document.querySelector('a[href="login.html"]');
  const registerLink = document.querySelector('a[href="register.html"]');
  if (loginLink) loginLink.href = buildAuthUrl("login.html", returnTo);
  if (registerLink) registerLink.href = buildAuthUrl("register.html", returnTo);

  const reasonMessages = {
    "guest-limit": "Your five free guest assessments are used. Log in to continue.",
    "login-required": "Log in to continue to the requested page.",
    "roadmap-required": "Log in to save progress and open your roadmap.",
    "session-expired": "Your session expired. Log in again to continue.",
    "storage-unavailable": "Guest usage could not be saved. Log in to continue.",
  };
  const reason = new URLSearchParams(window.location.search).get("reason");
  if (Object.prototype.hasOwnProperty.call(reasonMessages, reason)) {
    showAuthError(reasonMessages[reason]);
  }
});

function showAuthError(message) {
  const errorBox = document.getElementById("formError");
  if (errorBox) {
    errorBox.textContent = message;
  } else {
    alert(message);
  }
}

function clearAuthError() {
  const errorBox = document.getElementById("formError");
  if (errorBox) errorBox.textContent = "";
}

async function handleRegister(event) {
  event.preventDefault();
  const form = event.target;
  const button = form.querySelector('button[type="submit"]');
  clearAuthError();

  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = "Creating account...";

  try {
    await api.post("/auth/register", {
      name: form.elements.namedItem("name").value.trim(),
      email: form.elements.namedItem("email").value.trim(),
      password: form.elements.namedItem("password").value,
    });
    location.replace(buildAuthUrl("login.html", getAuthReturnTo()));
  } catch (error) {
    showAuthError(error.message);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const button = form.querySelector('button[type="submit"]');
  clearAuthError();

  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = "Logging in...";

  try {
    const { token, user } = await api.post("/auth/login", {
      email: form.elements.namedItem("email").value.trim(),
      password: form.elements.namedItem("password").value,
    });
    if (!token) throw new Error("No token returned by the server.");
    Token.set(token);
    if (user) Token.setUser(user);
    location.replace(getPostLoginDestination());
  } catch (error) {
    showAuthError(error.message);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}