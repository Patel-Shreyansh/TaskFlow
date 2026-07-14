/**
 * Shared logic for login.html and register.html.
 * Each page calls AuthPage.initLogin() or AuthPage.initRegister().
 */
const AuthPage = {
  redirectIfLoggedIn() {
    if (TokenStore.get()) {
      window.location.href = "index.html";
    }
  },

  setLoading(button, isLoading, idleText) {
    button.disabled = isLoading;
    button.textContent = isLoading ? "Please wait..." : idleText;
  },

  initLogin() {
    this.redirectIfLoggedIn();

    const form = document.getElementById("loginForm");
    const button = document.getElementById("loginBtn");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = document.getElementById("u").value.trim();
      const password = document.getElementById("p").value;

      if (!username || !password) {
        Toast.error("Please enter both username and password");
        return;
      }

      this.setLoading(button, true, "Login");
      try {
        const data = await Api.login({ username, password });
        TokenStore.set(data.token);
        TokenStore.setUser(data.user);
        window.location.href = "index.html";
      } catch (err) {
        Toast.error(err.message);
      } finally {
        this.setLoading(button, false, "Login");
      }
    });
  },

  initRegister() {
    this.redirectIfLoggedIn();

    const form = document.getElementById("registerForm");
    const button = document.getElementById("registerBtn");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = document.getElementById("u").value.trim();
      const email = document.getElementById("e").value.trim();
      const password = document.getElementById("p").value;

      if (!username || !password) {
        Toast.error("Username and password are required");
        return;
      }
      if (password.length < 6) {
        Toast.error("Password must be at least 6 characters");
        return;
      }

      this.setLoading(button, true, "Create account");
      try {
        const data = await Api.register({ username, email: email || undefined, password });
        TokenStore.set(data.token);
        TokenStore.setUser(data.user);
        Toast.success("Account created! Redirecting...");
        setTimeout(() => (window.location.href = "index.html"), 600);
      } catch (err) {
        Toast.error(err.message);
      } finally {
        this.setLoading(button, false, "Create account");
      }
    });
  },
};
