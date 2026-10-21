/* Everbliss Events - front-end demo functionality.
   Bookings and contact messages are not sent to a server. */
(function () {
  "use strict";
  const money = value => "₹" + Number(value || 0).toLocaleString("en-IN");
  const getBookings = () => {
    try { return JSON.parse(localStorage.getItem("everblissBookings") || "[]"); }
    catch (error) { return []; }
  };
  const saveBookings = bookings => localStorage.setItem("everblissBookings", JSON.stringify(bookings));
  const getParam = name => new URLSearchParams(window.location.search).get(name);
  const AUTH_KEY = "everblissLoggedInEmail";
  const isSignedIn = () => Boolean(sessionStorage.getItem(AUTH_KEY));

  // Protect the booking page, including direct URL visits.
  // Preserve event/package query parameters when sending the visitor to sign in.
  if (document.getElementById("bookingForm") && !isSignedIn()) {
    const requestedPage = "booking.html" + window.location.search;
    window.location.replace("login.html?next=" + encodeURIComponent(requestedPage));
    return;
  }

  // If a visitor clicks any booking link before signing in, send them to Sign In first.
  document.querySelectorAll('a[href*="booking.html"]').forEach(link => {
    link.addEventListener("click", function (event) {
      if (isSignedIn()) return;
      const target = link.getAttribute("href");
      event.preventDefault();
      window.location.href = "login.html?next=" + encodeURIComponent(target);
    });
  });

  // Only allow a local booking page as a post-authentication destination.
  function getAuthDestination() {
    const requested = getParam("next") || "";
    if (/^booking\.html(?:\?.*)?$/.test(requested)) return requested;
    return "index.html";
  }

  // Preserve the intended booking destination when switching between Sign In and Create Account.
  const nextDestination = getParam("next");
  if (/^booking\.html(?:\?.*)?$/.test(nextDestination || "")) {
    const registerLink = document.querySelector('a[href="register.html"]');
    const signInLink = document.querySelector('a[href="login.html"]');
    if (registerLink) registerLink.href = "register.html?next=" + encodeURIComponent(nextDestination);
    if (signInLink) signInLink.href = "login.html?next=" + encodeURIComponent(nextDestination);

    const loginStatusNotice = document.getElementById("loginStatus");
    const registerStatusNotice = document.getElementById("registerStatus");
    if (loginStatusNotice) loginStatusNotice.innerHTML =
      '<div class="alert-demo mb-3">Please sign in or create an account before booking an event.</div>';
    if (registerStatusNotice) registerStatusNotice.innerHTML =
      '<div class="alert-demo mb-3">Create your account to continue to your event booking.</div>';
  }

  // Set the earliest booking date to today.
  const dateInput = document.getElementById("eventDate");
  if (dateInput) {
    const today = new Date();
    const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split("T")[0];
    dateInput.min = localToday;
  }

  // Booking estimate: package price + optional treats add-on.
  const packageSelect = document.getElementById("packageSelect");
  const treatsSelect = document.getElementById("treatsSelect");
  const guestsInput = document.getElementById("guests");
  function updateEstimate() {
    const base = packageSelect ? Number(packageSelect.value || 0) : 0;
    const addOn = treatsSelect ? Number(treatsSelect.value || 0) : 0;
    const guestText = guestsInput && guestsInput.value ? guestsInput.value : "Not set";
    const packagePrice = document.getElementById("packagePrice");
    const treatsPrice = document.getElementById("treatsPrice");
    const totalPrice = document.getElementById("totalPrice");
    const guestSummary = document.getElementById("guestSummary");
    if (packagePrice) packagePrice.textContent = money(base);
    if (treatsPrice) treatsPrice.textContent = money(addOn);
    if (totalPrice) totalPrice.textContent = money(base + addOn);
    if (guestSummary) guestSummary.textContent = guestText;
  }
  [packageSelect, treatsSelect, guestsInput].forEach(el => {
    if (el) el.addEventListener("input", updateEstimate);
    if (el) el.addEventListener("change", updateEstimate);
  });
  updateEstimate();

  // Preselect event or package when a visitor clicks a service/package card.
  const eventParam = getParam("event");
  const packageParam = getParam("package");
  const eventSelect = document.getElementById("eventType");
  if (eventSelect && eventParam) {
    const match = Array.from(eventSelect.options).find(o => o.text.toLowerCase() === eventParam.toLowerCase());
    if (match) eventSelect.value = match.value;
  }
  if (packageSelect && packageParam) {
    const map = {
      "Sweet & Simple": "4999",
      "The Everbliss Edit": "9999",
      "Treats & Toasts": "2499"
    };
    if (map[packageParam]) packageSelect.value = map[packageParam];
    updateEstimate();
  }

  // Booking form validation and localStorage demo.
  const bookingForm = document.getElementById("bookingForm");
  if (bookingForm) {
    bookingForm.addEventListener("submit", function (event) {
      event.preventDefault();
      event.stopPropagation();
      bookingForm.classList.add("was-validated");
      const formMessage = document.getElementById("formMessage");
      if (!bookingForm.checkValidity()) {
        formMessage.innerHTML = '<div class="alert-demo alert-error">Please correct the highlighted fields before submitting.</div>';
        return;
      }
      const formData = new FormData(bookingForm);
      const booking = {
        id: "EV" + Date.now().toString().slice(-7),
        customerName: formData.get("customerName").trim(),
        email: formData.get("email").trim(),
        phone: formData.get("phone").trim(),
        eventType: formData.get("eventType"),
        eventDate: formData.get("eventDate"),
        eventTime: formData.get("eventTime"),
        venue: formData.get("venue").trim(),
        guests: Number(formData.get("guests")),
        packageName: packageSelect.options[packageSelect.selectedIndex].text,
        packagePrice: Number(packageSelect.value),
        treatsName: treatsSelect.options[treatsSelect.selectedIndex].text,
        treatsPrice: Number(treatsSelect.value),
        total: Number(packageSelect.value) + Number(treatsSelect.value),
        requirements: formData.get("requirements").trim(),
        status: "Request saved",
        createdAt: new Date().toLocaleString()
      };
      const bookings = getBookings();
      bookings.unshift(booking);
      saveBookings(bookings);
      formMessage.innerHTML = '<div class="alert-demo"><strong>Booking request saved!</strong><br>Your reference number is ' + booking.id + '. You can view it on My Bookings.</div>';
      bookingForm.reset();
      bookingForm.classList.remove("was-validated");
      updateEstimate();
      window.setTimeout(() => { window.location.href = "my-bookings.html"; }, 1600);
    });
  }

  // Render saved booking cards.
  const bookingsList = document.getElementById("bookingsList");
  if (bookingsList) {
    const bookings = getBookings();
    if (!bookings.length) {
      bookingsList.innerHTML = '<div class="empty-state"><div class="empty-icon">✦</div><h2>No bookings yet</h2><p>Your saved booking requests will appear here.</p><a class="btn btn-brand mt-2" href="booking.html">Book your first event</a></div>';
    } else {
      bookingsList.innerHTML = bookings.map(b => `
        <article class="booking-item">
          <div class="d-flex flex-column flex-sm-row justify-content-between gap-2 align-items-sm-start">
            <div><span class="status-chip">${escapeHTML(b.status || "Request saved")}</span><h3 class="mt-2">${escapeHTML(b.eventType)} · ${escapeHTML(b.packageName.split("—")[0])}</h3><p class="mb-3">Reference: <strong>${escapeHTML(b.id)}</strong></p></div>
            <strong class="price mt-0">${money(b.total)}</strong>
          </div>
          <div class="booking-meta">
            <div><strong>Date:</strong> ${escapeHTML(b.eventDate)} · ${escapeHTML(b.eventTime)}</div>
            <div><strong>Guest count:</strong> ${escapeHTML(b.guests)}</div>
            <div><strong>Customer:</strong> ${escapeHTML(b.customerName)}</div>
            <div><strong>Phone:</strong> ${escapeHTML(b.phone)}</div>
            <div><strong>Venue:</strong> ${escapeHTML(b.venue)}</div>
            <div><strong>Treats:</strong> ${escapeHTML(b.treatsName)}</div>
          </div>
          ${b.requirements ? `<p class="mt-3 mb-0"><strong>Special requirements:</strong> ${escapeHTML(b.requirements)}</p>` : ""}
        </article>`).join("");
    }
  }

  // Contact form: front-end validation and demonstration response.
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", function (event) {
      event.preventDefault(); event.stopPropagation();
      contactForm.classList.add("was-validated");
      const status = document.getElementById("contactMessageStatus");
      if (!contactForm.checkValidity()) {
        status.innerHTML = '<div class="alert-demo alert-error mb-3">Please check the highlighted fields.</div>';
        return;
      }
      status.innerHTML = '<div class="alert-demo mb-3">Thank you! Your message has been sent successfully.</div>';
      contactForm.reset(); contactForm.classList.remove("was-validated");
    });
  }



  // Registration: validate and create a new account.
  const getUsers = () => {
    try {
      const users = JSON.parse(localStorage.getItem("everblissUsers") || "[]");
      return Array.isArray(users) ? users : [];
    } catch (error) {
      return [];
    }
  };

  const saveUsers = users => {
    localStorage.setItem("everblissUsers", JSON.stringify(users));
  };

  const registerForm = document.getElementById("registerForm");

  if (registerForm) {
    registerForm.addEventListener("submit", function (event) {
      event.preventDefault();
      event.stopPropagation();

      registerForm.classList.add("was-validated");

      const name = document.getElementById("registerName").value.trim();
      const email = document.getElementById("registerEmail").value.trim().toLowerCase();
      const password = document.getElementById("registerPassword").value;
      const confirmPassword = document.getElementById("confirmPassword").value;
      const status = document.getElementById("registerStatus");

      // Check required fields, email format, and minimum lengths.
      if (!registerForm.checkValidity()) {
        status.innerHTML =
          '<div class="alert-demo alert-error mb-3">Please correct the highlighted fields.</div>';
        return;
      }

      // Check that both passwords match.
      if (password !== confirmPassword) {
        status.innerHTML =
          '<div class="alert-demo alert-error mb-3">Passwords do not match.</div>';
        document.getElementById("confirmPassword").setCustomValidity("Passwords do not match.");
        return;
      }

      document.getElementById("confirmPassword").setCustomValidity("");

      const users = getUsers();

      // Prevent duplicate accounts.
      if (users.some(user => user.email === email)) {
        status.innerHTML =
          '<div class="alert-demo alert-error mb-3">An account with this email already exists. Please sign in.</div>';
        return;
      }

      users.push({ name, email, password });
      saveUsers(users);

      // Creating an account signs the visitor in for this browser tab.
      sessionStorage.setItem(AUTH_KEY, email);

      status.innerHTML =
        '<div class="alert-demo mb-3">Account created successfully! Opening your booking...</div>';

      registerForm.reset();
      registerForm.classList.remove("was-validated");

      window.setTimeout(function () {
        window.location.href = getAuthDestination();
      }, 900);
    });

    // Recheck password validity when the user edits the confirmation field.
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const passwordInput = document.getElementById("registerPassword");

    function validatePasswordMatch() {
      if (confirmPasswordInput.value !== passwordInput.value) {
        confirmPasswordInput.setCustomValidity("Passwords do not match.");
      } else {
        confirmPasswordInput.setCustomValidity("");
      }
    }

    confirmPasswordInput.addEventListener("input", validatePasswordMatch);
    passwordInput.addEventListener("input", validatePasswordMatch);
  }

const demoAccounts = [
  {
    email: "jeru@everbliss.com",
    password: "jeru12345"
  },
  {
    email: "jeru@gmail.com",
    password: "jeru12345"
  }
];

function signIn(email, password) {
  const account = demoAccounts.find(user =>
    user.email === email.trim().toLowerCase() &&
    user.password === password
  );

  if (account) {
    window.location.href = "index.html";
  } else {
    alert("Invalid email or password. Please try again.");
  }
}

  // Sign in: accept only accounts registered in this browser.
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
      event.preventDefault();
      event.stopPropagation();

      loginForm.classList.add("was-validated");

      const status = document.getElementById("loginStatus");
      const email = document.getElementById("loginEmail").value.trim().toLowerCase();
      const password = document.getElementById("loginPassword").value;

      if (!loginForm.checkValidity()) {
        status.innerHTML =
          '<div class="alert-demo alert-error mb-3">Please enter a valid email address and password.</div>';
        return;
      }

      const registeredUser = getUsers().find(function (account) {
  return account.email === email && account.password === password;
});

const demoUser = demoAccounts.find(function (account) {
  return account.email === email && account.password === password;
});

// Accept either a registered account or a predefined demo account.
const user = registeredUser || demoUser;

if (!user) {
  status.innerHTML =
    '<div class="alert-demo alert-error mb-3">Account not found or password is incorrect. Please try again or create an account.</div>';
  return;
}

sessionStorage.setItem(AUTH_KEY, user.email);

status.innerHTML =
  '<div class="alert-demo mb-3">Sign-in successful! Continuing...</div>';

window.setTimeout(function () {
  window.location.href = getAuthDestination();
}, 700);
    });
  }


  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }
})();