// ==========================================
// AUTHENTICATION & PROFILE
// ==========================================
function handleLogin() {
  var loginId = document.getElementById('login-id').value;
  var loginPass = document.getElementById('login-pass').value;
  var errorEl = document.getElementById('login-err');

  if (!loginId) return showError(errorEl, "Mobile/CPN field cannot be blank.");
  toggleButtonState('btn-login', true, 'Verifying...');

  callBackendAPI("authenticate", { loginId: loginId, password: loginPass },
    function (response) {
      toggleButtonState('btn-login', false, 'Secure Sign In');
      if (response.success) {
        document.getElementById('login-pass').blur();
        document.getElementById('login-id').blur();
        if (response.isNewUser) {
          passwordSetupSource = 'login';
          window.tempLoginId = loginId;
          switchView('view-new-password');
        } else {
          activeUserSession = response.customerData;
          localStorage.setItem('wowdrops_customer_session', JSON.stringify(activeUserSession));
          updateHeaderDisplays();
          showDashboardSkeletons();
          switchView('view-dashboard');
          refreshCustomerSessionData(activeUserSession.cpn);
        }
      } else { showError(errorEl, response.message); }
    },
    function (err) {
      toggleButtonState('btn-login', false, 'Secure Sign In');
      showError(errorEl, "Network error.");
    }
  );
}

function logoutCustomer() {
  localStorage.removeItem('wowdrops_customer_session');
  activeUserSession = null;
  document.getElementById('dropdown-menu').classList.add('hidden');
  switchView('view-login');
  var msgEl = document.getElementById('login-msg');
  msgEl.innerText = "You have been successfully logged out.";
  msgEl.classList.remove('hidden');
  setTimeout(function () { msgEl.classList.add('hidden'); }, 4000);
}

function openProfile() {
  document.getElementById('prof-phone').value = activeUserSession.phone || "";
  document.getElementById('prof-cpn').value = activeUserSession.cpn || "";
  document.getElementById('prof-rate').value = activeUserSession.defaultRate || 0;
  document.getElementById('prof-email').value = activeUserSession.email || "";
  document.getElementById('prof-wa').value = activeUserSession.whatsapp || "";
  document.getElementById('prof-msg').classList.add('hidden');
  switchView('view-profile');
}

function submitProfileUpdate() {
  var email = document.getElementById('prof-email').value;
  var wa = document.getElementById('prof-wa').value;
  var msgEl = document.getElementById('prof-msg');

  toggleButtonState('btn-update-prof', true, 'Updating...');

  callBackendAPI("updateCustomerProfile", { cpn: activeUserSession.cpn, email: email, whatsapp: wa },
    function (res) {
      toggleButtonState('btn-update-prof', false, 'Update Profile');
      msgEl.innerText = res.message;
      msgEl.className = "text-sm font-bold text-center mt-2 block " + (res.success ? "text-emerald-600" : "text-red-500");
      if (res.success) {
        activeUserSession.email = email;
        activeUserSession.whatsapp = wa;
        localStorage.setItem('wowdrops_customer_session', JSON.stringify(activeUserSession));
        setTimeout(function () { msgEl.classList.add('hidden'); }, 4000);
      }
    }
  );
}

function openChangePassword() {
  passwordSetupSource = 'dashboard';
  document.getElementById('pass-setup-err').classList.add('hidden');
  document.getElementById('new-pass-1').value = '';
  document.getElementById('new-pass-2').value = '';
  switchView('view-new-password');
}

function cancelPasswordSetup() {
  if (passwordSetupSource === 'login') switchView('view-login'); else switchView('view-dashboard');
}

function submitPasswordSetup() {
  var targetId = passwordSetupSource === 'login' ? window.tempLoginId : activeUserSession.cpn;
  var p1 = document.getElementById('new-pass-1').value;
  var p2 = document.getElementById('new-pass-2').value;
  var errorEl = document.getElementById('pass-setup-err');
  if (!p1 || p1.length < 4) return showError(errorEl, "Password too short.");
  if (p1 !== p2) return showError(errorEl, "Passwords do not match.");

  callBackendAPI("setupNewPassword", { loginId: targetId, newPassword: p1 },
    function (res) {
      if (res.success) {
        alert(res.message);
        if (passwordSetupSource === 'login') switchView('view-login'); else switchView('view-dashboard');
      } else showError(errorEl, res.message);
    }
  );
}

function openForgotPassword() {
  document.getElementById('fp-step-1').classList.remove('hidden');
  document.getElementById('fp-step-2').classList.add('hidden');
  document.getElementById('fp-err-1').classList.add('hidden');
  document.getElementById('fp-id').value = '';
  switchView('view-forgot-password');
}

function requestOTP() {
  var loginId = document.getElementById('fp-id').value;
  var err = document.getElementById('fp-err-1');
  if (!loginId) return showError(err, "Enter your Mobile or CPN.");

  toggleButtonState('btn-fp-otp', true, 'Sending...');

  callBackendAPI("requestPasswordReset", { loginId: loginId },
    function (res) {
      toggleButtonState('btn-fp-otp', false, 'Send Reset OTP to Email');
      if (res.success) {
        document.getElementById('fp-step-1').classList.add('hidden');
        document.getElementById('fp-step-2').classList.remove('hidden');
        window.tempRecoveryId = loginId;
      } else { showError(err, res.message); }
    }
  );
}

function verifyAndResetPassword() {
  var otp = document.getElementById('fp-otp-input').value;
  var np = document.getElementById('fp-new-pass').value;
  var err = document.getElementById('fp-err-2');

  if (!otp || otp.length < 6) return showError(err, "Enter valid 6-digit OTP.");
  if (!np || np.length < 4) return showError(err, "Password too short.");

  toggleButtonState('btn-fp-reset', true, 'Verifying...');

  callBackendAPI("verifyOTPAndReset", { loginId: window.tempRecoveryId, otp: otp, newPassword: np },
    function (res) {
      toggleButtonState('btn-fp-reset', false, 'Verify & Reset Password');
      if (res.success) {
        alert(res.message);
        switchView('view-login');
      } else { showError(err, res.message); }
    }
  );
}

// ==========================================
// EMAIL COLLECTION
// ==========================================
function checkEmailCollection() {
  if (!activeUserSession.email && sessionStorage.getItem('email_skipped') !== 'true') {
    setTimeout(function () { document.getElementById('email-modal').classList.remove('hidden'); }, 1500);
  } else {
    if (typeof checkNotificationStatus === "function") checkNotificationStatus();
  }
}

function skipEmailCapture() {
  sessionStorage.setItem('email_skipped', 'true');
  document.getElementById('email-modal').classList.add('hidden');
  setTimeout(function() {
    if (typeof checkNotificationStatus === "function") checkNotificationStatus();
  }, 500);
}

function saveCapturedEmail() {
  var email = document.getElementById('capture-email').value;
  if (!email || email.indexOf('@') === -1) return alert("Please enter a valid email address.");

  toggleButtonState('btn-save-email', true, 'Saving...');

  callBackendAPI("updateCustomerProfile", { cpn: activeUserSession.cpn, email: email, whatsapp: "" },
    function (res) {
      toggleButtonState('btn-save-email', false, 'Save Email');
      if (res.success) {
        activeUserSession.email = email;
        localStorage.setItem('wowdrops_customer_session', JSON.stringify(activeUserSession));
        document.getElementById('email-modal').classList.add('hidden');
        setTimeout(function() {
          if (typeof checkNotificationStatus === "function") checkNotificationStatus();
        }, 500);
      } else { alert(res.message); }
    }
  );
}