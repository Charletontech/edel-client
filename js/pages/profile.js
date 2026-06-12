Edel.initIcons();
Edel.applySafeArea();

let currentOpenModal = null;

if (!EdelModules.auth.requireAuth()) {
  throw new Error("Authentication required");
}

const customerRoleTagClass =
  "bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-full self-center md:self-auto uppercase tracking-wide";
const providerRoleTagClass =
  "bg-brand-accent text-brand-navy text-xs font-bold px-3 py-1 rounded-full self-center md:self-auto shadow-sm tracking-wide";

function getSessionRole(user = EdelModules.auth.getUser()) {
  if (!user) return "customer";
  if (user.role === "both") {
    return EdelModules.auth.getSessionRole(user) || "customer";
  }
  return user.role || "customer";
}

function getRoleLabel(user = EdelModules.auth.getUser()) {
  return EdelModules.auth.getRoleLabel(user);
}

function updateVerifiedBadge(user = EdelModules.auth.getUser()) {
  if (!profileElements.badge) return;

  const sessionRole = getSessionRole(user);
  const shouldShowBadge = !!user?.hasPaidAccessFee && sessionRole === "provider";

  profileElements.badge.classList.toggle("hidden", !shouldShowBadge);
}

const profileElements = {
  name: document.getElementById("profile-name"),
  roleTag: document.getElementById("profile-role-tag"),
  rating: document.getElementById("profile-rating"),
  avatar: document.getElementById("profile-avatar"),
  badge: document.getElementById("profile-badge-container"),
  completedJobsMetric: document.getElementById("metric-completed-jobs"),
  completedJobsCount: document.getElementById("jobs-completed-count"),
  providerSections: document.getElementById("provider-sections"),
  infoName: document.getElementById("info-name"),
  infoEmail: document.getElementById("info-email"),
  infoPhone: document.getElementById("info-phone"),
  logoutButton: document.getElementById("logout-button"),
  servicesList: document.getElementById("services-list"),
  statusSelect: document.getElementById("provider-status"),
  notificationDot: document.getElementById("notification-dot-profile"),
  reportsList: document.getElementById("reports-list-container"),
};

const reportsModalController = EdelModules.ui.createOverlayModal({
  overlay: document.getElementById("reports-modal"),
  defaultPanelClass: "flex",
});

function openReportsModal() {
  reportsModalController.open(document.getElementById('reports-modal-content'), {
    panelClass: "flex",
    hiddenPanelClasses: ["translate-y-full", "lg:translate-y-8"],
    visiblePanelClasses: ["translate-y-0"],
  });
}

window.closeReportsModal = () => {
  reportsModalController.close({
    hiddenPanelClasses: ["translate-y-full", "lg:translate-y-8"],
    visiblePanelClasses: ["translate-y-0"],
  });
};

function renderReports(reports) {
  if (!profileElements.reportsList) return;

  const hasUnresolved = reports.some(r => r.reportStatus === 'open');
  if (profileElements.notificationDot) {
    profileElements.notificationDot.classList.toggle('hidden', !hasUnresolved);
  }

  if (reports.length === 0) {
    profileElements.reportsList.innerHTML = `
      <div class="flex flex-col items-center justify-center py-12 text-center">
        <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <i data-lucide="bell-off" class="w-8 h-8 text-slate-300"></i>
        </div>
        <h3 class="font-bold text-brand-navy">No notifications</h3>
        <p class="text-sm text-slate-500">You're all caught up!</p>
      </div>
    `;
    Edel.initIcons();
    return;
  }

  profileElements.reportsList.innerHTML = reports.map(report => {
    const statusColors = {
      open: 'bg-blue-100 text-blue-700',
      reviewed: 'bg-orange-100 text-orange-700',
      resolved: 'bg-green-100 text-green-700'
    };

    const resolutionText = report.reportResolution 
      ? `<div class="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
           <p class="text-xs font-bold text-slate-500 uppercase mb-1">Admin Resolution</p>
           <p class="text-sm text-brand-navy font-medium">${report.reportResolution.replace(/_/g, ' ')}</p>
           ${report.adminNote ? `<p class="text-xs text-slate-500 mt-1 italic">"${report.adminNote}"</p>` : ''}
         </div>`
      : '';

    return `
      <div class="p-4 border border-slate-100 rounded-2xl mb-4 hover:border-brand-accent transition-colors">
        <div class="flex justify-between items-start mb-2">
          <span class="text-xs font-bold ${statusColors[report.reportStatus] || 'bg-slate-100 text-slate-600'} px-2 py-0.5 rounded uppercase tracking-wider">
            ${report.reportStatus}
          </span>
          <span class="text-[10px] text-slate-400 font-medium">
            ${new Date(report.reportedAt).toLocaleDateString()}
          </span>
        </div>
        <h4 class="font-bold text-brand-navy text-sm mb-1">${report.serviceTitle}</h4>
        <p class="text-xs text-slate-500 line-clamp-2">${report.reportMessage}</p>
        ${resolutionText}
      </div>
    `;
  }).join('');

  Edel.initIcons();
}

function syncProfileInputs(user) {
  if (profileElements.infoName) {
    profileElements.infoName.value = user.fullName || "";
  }

  if (profileElements.infoEmail) {
    profileElements.infoEmail.value = user.email || "";
  }

  if (profileElements.infoPhone) {
    profileElements.infoPhone.value = user.phoneNumber || "";
  }
}

function hydrateProfile(user) {
  if (!user) return;

  // Populate sidebar (consistency across pages)
  const sidebarName = document.getElementById("sidebar-user-name");
  const sidebarRole = document.getElementById("sidebar-role");
  const sidebarImg = document.getElementById("sidebar-user-img");

  if (sidebarName) sidebarName.textContent = user.fullName || "User";
  if (sidebarRole) {
    sidebarRole.textContent = getRoleLabel(user);
  }
  if (sidebarImg) {
    sidebarImg.src = EdelModules.api.buildUrl(
      user.profilePhoto || "/assets/images/avatar.jpg",
    );
  }

  const sessionRole = getSessionRole(user);
  const isProviderRole = sessionRole === "provider";
  const fullName = user.fullName || "E-del User";

  profileElements.name.innerText = fullName;
  
  // Update location
  const locationElement = document.getElementById("profile-location");
  if (locationElement) {
    locationElement.innerText = EdelModules.location.formatLocationLabel(
      user.locationLabel,
      "Current location",
    );
  }
  
  // Logic for initial display (will be refined by setView)
  profileElements.roleTag.innerText = sessionRole === "provider" ? "Provider" : "Customer";
  profileElements.roleTag.className = sessionRole === "provider"
    ? providerRoleTagClass
    : customerRoleTagClass;

  // Rating logic
  const rating = user.rating || (sessionRole === "provider" ? 50 : 100);
  const ratingTrend = rating >= (sessionRole === "provider" ? 50 : 100)
      ? "trending-up"
      : "trending-down";
  const trendColor =
    ratingTrend === "trending-up" ? "text-green-500" : "text-red-500";

  profileElements.rating.innerHTML = `${rating}% <i data-lucide="${ratingTrend}" class="w-4 h-4 ${trendColor}"></i>`;

  if (isProviderRole) {
    profileElements.completedJobsCount.innerText = user.jobsCompleted || 0;
    if (profileElements.statusSelect) {
      profileElements.statusSelect.value =
        user.availabilityStatus || "available";
      updateStatusUI(user.availabilityStatus || "available");
    }
    renderServices(user.services || []);
  }

  // Sync toggles
  const pushToggle = document.getElementById("toggle-push");
  const emailToggle = document.getElementById("toggle-email");
  const smsToggle = document.getElementById("toggle-sms");

  if (pushToggle) pushToggle.checked = !!user.pushNotifications;
  if (emailToggle) emailToggle.checked = !!user.emailAlerts;
  if (smsToggle) smsToggle.checked = !!user.smsUpdates;

  syncProfileInputs(user);

  const switchButton = document.getElementById("btn-switch-account");
  if (switchButton) {
    switchButton.classList.toggle("hidden", user.role !== "both");
  }

  const currentView = document.getElementById("provider-sections")?.classList.contains("hidden") ? "customer" : "provider";
  const targetView = user.role === "both"
    ? (user.activeRole || currentView || "customer")
    : (user.role === "provider" ? "provider" : "customer");
  
  setView(targetView);
  Edel.initIcons();
}

async function updateProfile() {
  const fullName = document.getElementById("info-name").value;
  const email = document.getElementById("info-email").value;
  const phoneNumber = document.getElementById("info-phone").value;

  if (!fullName || !email || !phoneNumber) {
    Ui.toast("warning", "Missing Fields", "Please fill all profile fields.");
    return;
  }

  try {
    await EdelModules.api.put(
      "/api/profile",
      {
        fullName,
        email,
        phoneNumber,
      },
      {
        headers: EdelModules.auth.getAuthHeaders(),
        silent: true,
      },
    );

    Ui.toast("success", "Profile Updated", "Your information has been saved.");
    closeModals();
    refreshDashboard();
  } catch (error) {
    Ui.toast("error", "Update Failed", error.message);
  }
}

async function updatePreferences() {
  const pushNotifications = document.getElementById("toggle-push").checked;
  const emailAlerts = document.getElementById("toggle-email").checked;
  const smsUpdates = document.getElementById("toggle-sms").checked;

  try {
    await EdelModules.api.put(
      "/api/preferences",
      {
        pushNotifications,
        emailAlerts,
        smsUpdates,
      },
      {
        headers: EdelModules.auth.getAuthHeaders(),
        silent: true,
      },
    );

    Ui.toast("success", "Preferences Updated", "Your settings have been saved.");
    closeModals();
    refreshDashboard();
  } catch (error) {
    Ui.toast("error", "Update Failed", error.message);
  }
}

async function updatePassword() {
  const currentPassword = document.getElementById("current-password").value;
  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (!currentPassword || !newPassword || !confirmPassword) {
    Ui.toast("warning", "Missing Fields", "Please fill all password fields.");
    return;
  }

  if (newPassword !== confirmPassword) {
    Ui.toast("error", "Mismatch", "New passwords do not match.");
    return;
  }

  try {
    await EdelModules.api.put(
      "/api/password",
      {
        currentPassword,
        newPassword,
      },
      {
        headers: EdelModules.auth.getAuthHeaders(),
        silent: true,
      },
    );

    Ui.toast("success", "Password Changed", "Security updated successfully.");
    closeModals();

    // Clear fields
    document.getElementById("current-password").value = "";
    document.getElementById("new-password").value = "";
    document.getElementById("confirm-password").value = "";
  } catch (error) {
    Ui.toast("error", "Update Failed", error.message);
  }
}

async function deleteAccount() {
  const confirmed = confirm(
    "Are you absolutely sure? This action is permanent and cannot be undone.",
  );

  if (!confirmed) return;

  try {
    await EdelModules.api.delete("/api/", {
      headers: EdelModules.auth.getAuthHeaders(),
      silent: true,
    });

    Ui.alert(
      "info",
      "Account Deleted",
      "Your account has been removed. Redirecting...",
    );
    setTimeout(() => {
      EdelModules.auth.logout();
    }, 2000);
  } catch (error) {
    Ui.toast("error", "Deletion Failed", error.message);
  }
}

function renderServices(services) {
  if (!profileElements.servicesList) return;

  if (services.length === 0) {
    profileElements.servicesList.innerHTML = `
      <div class="p-8 text-center border-2 border-dashed border-slate-200 rounded-3xl">
        <p class="text-slate-400 font-medium">No services listed yet.</p>
      </div>
    `;
    return;
  }

  profileElements.servicesList.innerHTML = services
    .map(
      (service) => {
        const isDisabled = service.serviceStatus === 'disabled';
        const statusBadge = isDisabled 
          ? `<span class="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider rounded-md ml-2">Disabled</span>` 
          : '';
        const opacityClass = isDisabled ? 'opacity-60' : '';

        return `
    <div class="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-brand-accent transition-all relative hover:z-50 ${opacityClass}">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-100 shadow-sm">
          <img 
            src="${EdelModules.api.buildUrl(service.businessPhoto || "/assets/images/business-photo-default.jpg")}" 
            class="w-full h-full object-cover"
          />
        </div>
        <div>
          <h4 class="font-bold text-brand-navy text-sm flex items-center">${service.title} ${statusBadge}</h4>
          <p class="text-xs text-slate-500">₦${Number(service.basePrice).toLocaleString()} Base • ${service.category}</p>
        </div>
      </div>
      <div class="relative group service-menu-container">
        <button class="text-slate-400 hover:text-brand-navy focus:text-brand-navy p-2" onclick="toggleServiceMenu(this); event.stopPropagation();">
          <i data-lucide="more-vertical" class="w-5 h-5 pointer-events-none"></i>
        </button>
        <div class="service-dropdown-menu absolute right-0 top-full pt-1 w-40 hidden lg:group-hover:block z-50">
          <div class="bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden">
            <button onclick="viewServiceDetails(${service.id})" class="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 first:rounded-t-xl">Details</button>
            ${!isDisabled ? `<button onclick="editService(${service.id})" class="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Edit</button>` : ''}
            <button onclick="deleteService(${service.id})" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 last:rounded-b-xl">Delete</button>
          </div>
        </div>
      </div>
    </div>
  `})
    .join("");

  Edel.initIcons();
}

const cachedUser = EdelModules.auth.getUser();
if (cachedUser) {
  hydrateProfile(cachedUser);
  showPostAuthNotifications(cachedUser);
}

// Load Categories
(async function loadCategories() {
  try {
    const categories = await EdelModules.api.get("/api/services/categories", {
      headers: EdelModules.auth.getAuthHeaders()
    });
    
    const newCatSelect = document.getElementById("new-category");
    const upgradeCatSelect = document.getElementById("upgrade-category");
    
    const optionsHtml = `<option value="" disabled selected hidden></option>` + 
      categories.map(c => `<option value="${c.name}">${c.name.charAt(0).toUpperCase() + c.name.slice(1)}</option>`).join('');

    if (newCatSelect) newCatSelect.innerHTML = optionsHtml;
    if (upgradeCatSelect) upgradeCatSelect.innerHTML = optionsHtml;
  } catch (error) {
    console.error("Failed to load categories", error);
  }
})();

function showPostAuthNotifications(user) {
  try {
    const justLoggedIn = localStorage.getItem("edel_just_logged_in");
    const justSignedUp = localStorage.getItem("edel_just_signed_up");

    if (justLoggedIn) {
      localStorage.removeItem("edel_just_logged_in");
      Ui.alert(
        "success",
        "Signed In",
        `Welcome back, ${user?.fullName || "E-del User"}!`,
      );
      return;
    }

    if (justSignedUp) {
      localStorage.removeItem("edel_just_signed_up");
      Ui.toast(
        "success",
        "Account Created",
        `Welcome ${user?.fullName || "to E-del"}!`,
      );
    }
  } catch (e) {
    console.warn("Post-auth notification error:", e);
  }
}

function refreshDashboard() {
  return EdelModules.auth
    .fetchDashboard()
    .then((response) => {
      if (!response?.user) return;
      const currentUser = EdelModules.auth.getUser() || {};
      const updatedUser = { ...currentUser, ...response.user };
      EdelModules.auth.setUser(updatedUser);
      hydrateProfile(updatedUser);
      if (response.reports) renderReports(response.reports);
      return updatedUser;
    })
    .catch((error) => {
      if (error.status === 401) {
        EdelModules.auth.logout();
        return;
      }
      Ui.toast("warning", "Profile Sync Failed", error.message);
    });
}

refreshDashboard();

document.getElementById("notifications-btn-profile")?.addEventListener("click", openReportsModal);

document.getElementById("btn-switch-account")?.addEventListener("click", () => {
  const user = EdelModules.auth.getUser();
  if (user?.role !== "both") return;
  openModal("modal-switch-account");
});

profileElements.logoutButton?.addEventListener("click", () => {
  EdelModules.auth.logout();
});

function setView(viewType) {
  const currentUser = EdelModules.auth.getUser() || {};
  const currentRole = currentUser.role || "customer";

  const btnCustDes = document.getElementById("btn-view-customer");
  const btnProvDes = document.getElementById("btn-view-provider");
  const btnCustMob = document.getElementById("btn-view-customer-mob");
  const btnProvMob = document.getElementById("btn-view-provider-mob");
  const profileName = document.getElementById("profile-name");
  const profileRoleTag = document.getElementById("profile-role-tag");
  const profileRating = document.getElementById("profile-rating");
  const profileAvatar = document.getElementById("profile-avatar");
  const profileBadge = document.getElementById("profile-badge-container");
  const metricCompleted = document.getElementById("metric-completed-jobs");
  const providerSections = document.getElementById("provider-sections");
  const fullName = currentUser.fullName || "E-del User";

  const activeClass =
    "px-6 py-2 rounded-lg bg-brand-navy text-brand-accent font-bold text-sm shadow-sm transition-all flex-1 md:flex-none";
  const inactiveClass =
    "px-6 py-2 rounded-lg text-slate-500 font-bold text-sm hover:text-brand-navy transition-all flex-1 md:flex-none opacity-60";

  if (currentRole === "both") {
    if (!["customer", "provider"].includes(viewType)) return;

    EdelModules.auth.setSessionRole(viewType);
    const updatedUser = EdelModules.auth.getUser() || currentUser;

    if (viewType === "customer") {
      if (btnCustDes) btnCustDes.className = activeClass;
      if (btnCustMob) btnCustMob.className = activeClass;
      if (btnProvDes) btnProvDes.className = inactiveClass;
      if (btnProvMob) btnProvMob.className = inactiveClass;

      if (profileName) profileName.innerText = fullName;
      if (profileRoleTag) {
        profileRoleTag.innerText = "Customer";
        profileRoleTag.className = customerRoleTagClass;
      }
      if (profileRating) {
        profileRating.innerHTML =
          '100% <i data-lucide="trending-up" class="w-4 h-4 text-green-500"></i>';
      }
      if (profileAvatar) {
        profileAvatar.src = EdelModules.api.buildUrl(
          updatedUser.profilePhoto || "/assets/images/avatar.jpg",
        );
      }
      metricCompleted?.classList.add("hidden");
      providerSections?.classList.add("hidden");
    } else {
      if (btnProvDes) btnProvDes.className = activeClass;
      if (btnProvMob) btnProvMob.className = activeClass;
      if (btnCustDes) btnCustDes.className = inactiveClass;
      if (btnCustMob) btnCustMob.className = inactiveClass;

      if (profileName) profileName.innerText = fullName;
      if (profileRoleTag) {
        profileRoleTag.innerText = "Provider";
        profileRoleTag.className = providerRoleTagClass;
      }
      if (profileRating) {
        const rating = updatedUser.rating || 50;
        profileRating.innerHTML = `${rating}% <i data-lucide="minus" class="w-4 h-4 text-slate-400"></i>`;
      }
      if (profileAvatar) {
        profileAvatar.src = EdelModules.api.buildUrl(
          updatedUser.profilePhoto || "/assets/images/avatar.jpg",
        );
      }
      metricCompleted?.classList.remove("hidden");
      providerSections?.classList.remove("hidden");
    }

    syncProfileInputs(updatedUser);
    updateVerifiedBadge(updatedUser);
    Edel.initIcons();
    closeModals();
    return;
  }

  if (currentRole !== viewType) {
    const promptTitle = document.getElementById("upgrade-prompt-title");
    const promptMsg = document.getElementById("upgrade-prompt-message");
    const promptIcon = document.getElementById("upgrade-prompt-icon");
    const confirmBtn = document.getElementById("btn-confirm-upgrade");

    if (viewType === "provider") {
      promptTitle.innerText = "Switch to Provider";
      promptMsg.innerText =
        "You are currently a Customer. To access the Provider dashboard and list services, you need to create a Provider profile.";
      promptIcon.setAttribute("data-lucide", "shield-plus");
      confirmBtn.innerHTML = 'Create Provider Profile <i data-lucide="arrow-right" class="w-5 h-5"></i>';
      confirmBtn.onclick = () => {
        closeModals();
        setTimeout(() => openModal("modal-upgrade-provider"), 350);
      };
    } else {
      promptTitle.innerText = "Switch to Customer";
      promptMsg.innerText =
        "You are currently a Provider. To access the Customer discovery view and request services, you need to enable Customer features.";
      promptIcon.setAttribute("data-lucide", "user-plus");
      confirmBtn.innerHTML = 'Enable Customer View <i data-lucide="arrow-right" class="w-5 h-5"></i>';
      confirmBtn.onclick = () => upgradeAccount("customer");
    }

    openModal("modal-upgrade-prompt");
    Edel.initIcons();
    return;
  }

  if (viewType === "customer") {
    if (btnCustDes) btnCustDes.className = activeClass;
    if (btnCustMob) btnCustMob.className = activeClass;
    if (btnProvDes) btnProvDes.className = inactiveClass;
    if (btnProvMob) btnProvMob.className = inactiveClass;

    if (profileName) profileName.innerText = fullName;
    if (profileRoleTag) {
      profileRoleTag.innerText = "Customer";
      profileRoleTag.className = customerRoleTagClass;
    }
    if (profileRating) {
      profileRating.innerHTML =
        '100% <i data-lucide="trending-up" class="w-4 h-4 text-green-500"></i>';
    }
    if (profileAvatar) {
      profileAvatar.src = EdelModules.api.buildUrl(
        currentUser.profilePhoto || "/assets/images/avatar.jpg",
      );
    }

    metricCompleted?.classList.add("hidden");
    providerSections?.classList.add("hidden");
  } else {
    if (btnProvDes) btnProvDes.className = activeClass;
    if (btnProvMob) btnProvMob.className = activeClass;
    if (btnCustDes) btnCustDes.className = inactiveClass;
    if (btnCustMob) btnCustMob.className = inactiveClass;

    if (profileName) profileName.innerText = fullName;
    if (profileRoleTag) {
      profileRoleTag.innerText = "Provider";
      profileRoleTag.className = providerRoleTagClass;
    }
    if (profileRating) {
      const rating = currentUser.rating || 50;
      profileRating.innerHTML = `${rating}% <i data-lucide="minus" class="w-4 h-4 text-slate-400"></i>`;
    }
    if (profileAvatar) {
      profileAvatar.src = EdelModules.api.buildUrl(
        currentUser.profilePhoto || "/assets/images/avatar.jpg",
      );
    }

    metricCompleted?.classList.remove("hidden");
    providerSections?.classList.remove("hidden");
  }

  syncProfileInputs(currentUser);
  updateVerifiedBadge(currentUser);
  Edel.initIcons();
}

async function upgradeAccount(targetRole, payload = {}) {
  try {
    const response = await EdelModules.api.post("/api/upgrade", {
      targetRole,
      ...payload
    }, {
      headers: EdelModules.auth.getAuthHeaders(),
      silent: true,
    });

    Ui.toast("success", "Account Upgraded", response.message);
    
    // Update local user session
    const currentUser = EdelModules.auth.getUser();
    currentUser.role = 'both';
    currentUser.activeRole = targetRole;
    if (targetRole === 'provider') {
      currentUser.serviceCategory = payload.serviceCategory;
      currentUser.serviceTitle = payload.serviceTitle;
      currentUser.basePrice = payload.basePrice;
      currentUser.serviceDescription = payload.serviceDescription;
    }
    EdelModules.auth.setUser(currentUser);

    closeModals();
    setView(targetRole);
    await refreshDashboard();
  } catch (error) {
    Ui.toast("error", "Upgrade Failed", error.message);
  }
}

async function submitProviderUpgrade() {
  const serviceCategory = document.getElementById("upgrade-category").value;
  const serviceTitle = document.getElementById("upgrade-title").value;
  const basePrice = document.getElementById("upgrade-price").value;
  const serviceDescription = document.getElementById("upgrade-desc").value;
  const photoInput = document.getElementById("upgrade-business-photo");

  if (!serviceCategory || !serviceTitle || !basePrice || !serviceDescription) {
    Ui.toast("warning", "Missing Fields", "Please fill all fields to upgrade.");
    return;
  }

  if (!photoInput.files[0]) {
    Ui.toast("warning", "Photo Required", "Please upload a business photo for your service");
    return;
  }

  const formData = new FormData();
  formData.append("targetRole", "provider");
  formData.append("serviceCategory", serviceCategory);
  formData.append("serviceTitle", serviceTitle);
  formData.append("basePrice", Number(basePrice));
  formData.append("serviceDescription", serviceDescription);
  formData.append("businessPhoto", photoInput.files[0]);

  try {
    Ui.toast("info", "Upgrading Account", "Setting up your provider profile...");
    const response = await EdelModules.api.post("/api/upgrade", formData, {
      headers: EdelModules.auth.getAuthHeaders(),
      silent: true,
    });

    Ui.toast("success", "Account Upgraded", response.message);
    
    // Update local user session
    const currentUser = EdelModules.auth.getUser();
    currentUser.role = 'both';
    currentUser.activeRole = 'provider';
    currentUser.serviceCategory = serviceCategory;
    currentUser.serviceTitle = serviceTitle;
    currentUser.basePrice = basePrice;
    currentUser.serviceDescription = serviceDescription;
    EdelModules.auth.setUser(currentUser);

    closeModals();
    setView("provider");
    await refreshDashboard();
  } catch (error) {
    Ui.toast("error", "Upgrade Failed", error.message);
  }
}

async function updateProviderStatus(selectElement) {
  const newStatus = selectElement.value;

  try {
    await EdelModules.api.put(
      "/api/status",
      { status: newStatus },
      {
        headers: EdelModules.auth.getAuthHeaders(),
        silent: true,
      },
    );

    updateStatusUI(newStatus);
    Ui.toast("success", "Status Updated", `You are now ${newStatus}`);
  } catch (error) {
    Ui.toast("error", "Update Failed", error.message);
    // Revert select if failed
    const currentUser = EdelModules.auth.getUser();
    selectElement.value = currentUser.availabilityStatus || "available";
  }
}

function updateStatusUI(status) {
  const iconContainer = document.getElementById("status-icon-container");
  const description = document.getElementById("status-description");
  const selectElement = document.getElementById("provider-status");

  if (!iconContainer || !description) return;

  selectElement.classList.remove(
    "status-available",
    "status-busy",
    "status-unavailable",
  );

  iconContainer.className =
    "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-300";

  switch (status) {
    case "available":
      selectElement.classList.add("status-available");
      iconContainer.classList.add("bg-green-50", "text-green-600");
      iconContainer.innerHTML =
        '<i data-lucide="activity" class="w-6 h-6"></i>';
      description.innerText = "Currently receiving service requests.";
      break;
    case "busy":
      selectElement.classList.add("status-busy");
      iconContainer.classList.add("bg-orange-50", "text-orange-600");
      iconContainer.innerHTML = '<i data-lucide="clock" class="w-6 h-6"></i>';
      description.innerText = "On a job. Might be slow to respond.";
      break;
    case "unavailable":
      selectElement.classList.add("status-unavailable");
      iconContainer.classList.add("bg-red-50", "text-red-600");
      iconContainer.innerHTML = '<i data-lucide="moon" class="w-6 h-6"></i>';
      description.innerText = "Not accepting any requests right now.";
      break;
  }

  Edel.initIcons();
}

// Service Management
// File Upload Label Helpers
document.getElementById('new-business-photo')?.addEventListener('change', (e) => {
  const label = document.getElementById('photo-upload-label');
  if (!label) return;
  if (e.target.files[0]) {
    label.innerText = `Selected: ${e.target.files[0].name}`;
    label.classList.add('text-brand-navy');
  } else {
    label.innerText = 'Upload Business Photo';
    label.classList.remove('text-brand-navy');
  }
});

document.getElementById('upgrade-business-photo')?.addEventListener('change', (e) => {
  const label = document.getElementById('upgrade-photo-upload-label');
  if (!label) return;
  if (e.target.files[0]) {
    label.innerText = `Selected: ${e.target.files[0].name}`;
    label.classList.add('text-brand-navy');
  } else {
    label.innerText = 'Upload Business Photo';
    label.classList.remove('text-brand-navy');
  }
});

async function saveNewService() {
  const category = document.getElementById("new-category").value;
  const title = document.getElementById("new-title").value;
  const basePrice = document.getElementById("new-price").value;
  const description = document.getElementById("new-desc").value;
  const photoInput = document.getElementById("new-business-photo");

  if (!category || !title || !basePrice || !description) {
    Ui.toast("warning", "Missing Info", "Please fill all fields");
    return;
  }

  if (!photoInput.files[0]) {
    Ui.toast("warning", "Photo Required", "Please upload a business photo for your service");
    return;
  }

  const formData = new FormData();
  formData.append("category", category);
  formData.append("title", title);
  formData.append("basePrice", Number(basePrice));
  formData.append("description", description);
  formData.append("businessPhoto", photoInput.files[0]);

  try {
    Ui.toast("info", "Adding Service", "Uploading your service details...");
    await EdelModules.api.post(
      "/api/services",
      formData,
      {
        headers: EdelModules.auth.getAuthHeaders(),
        silent: true,
      },
    );

    Ui.toast("success", "Service Added", "Your new service is now live!");
    closeModals();
    refreshDashboard();

    // Clear form
    document.getElementById("new-category").value = "";
    document.getElementById("new-title").value = "";
    document.getElementById("new-price").value = "";
    document.getElementById("new-desc").value = "";
    if (photoInput) photoInput.value = "";
    const photoLabel = document.getElementById("photo-upload-label");
    if (photoLabel) photoLabel.innerText = "Upload Business Photo";
  } catch (error) {
    Ui.toast("error", "Failed to Add Service", error.message);
  }
}

async function deleteService(id) {
  const confirmed = await new Promise((resolve) => {
    // Using a simple confirm for now, or CoolAlert if preferred
    if (confirm("Are you sure you want to delete this service?")) {
      resolve(true);
    } else {
      resolve(false);
    }
  });

  if (!confirmed) return;

  try {
    await EdelModules.api.delete(`/api/services/${id}`, {
      headers: EdelModules.auth.getAuthHeaders(),
      silent: true,
    });

    Ui.toast("success", "Service Deleted", "The service has been removed.");
    refreshDashboard();
  } catch (error) {
    Ui.toast("error", "Delete Failed", error.message);
  }
}

// Service Menu Mobile Helper
window.toggleServiceMenu = function(button) {
  const menu = button.nextElementSibling;
  const isHidden = menu.classList.contains('hidden');
  
  // Close all menus first
  document.querySelectorAll('.service-dropdown-menu').forEach(m => m.classList.add('hidden'));
  
  if (isHidden) {
    menu.classList.remove('hidden');
  }
};

document.addEventListener('click', (e) => {
  if (!e.target.closest('.service-menu-container')) {
    document.querySelectorAll('.service-dropdown-menu').forEach(m => m.classList.add('hidden'));
  }
});

function editService(id) {
  const user = EdelModules.auth.getUser();
  const service = user.services.find((s) => s.id === id);

  if (!service) return;

  // Fill "Add Service" modal with data and change its behavior
  document.getElementById("new-category").value = service.category;
  document.getElementById("new-title").value = service.title;
  document.getElementById("new-price").value = service.basePrice;
  document.getElementById("new-desc").value = service.description;
  
  // Reset photo field for edit
  const photoInput = document.getElementById("new-business-photo");
  if (photoInput) photoInput.value = "";
  
  const photoLabel = document.getElementById("photo-upload-label");
  if (photoLabel) photoLabel.innerText = "Change Business Photo (Optional)";

  const modalTitle = document.querySelector("#modal-add-service h3");
  const saveBtn = document.getElementById("btn-save-service");

  modalTitle.innerText = "Edit Service";
  saveBtn.innerText = "Update Service";
  saveBtn.setAttribute("onclick", `updateService(${id})`);

  openModal("modal-add-service");
}

async function updateService(id) {
  const category = document.getElementById("new-category").value;
  const title = document.getElementById("new-title").value;
  const basePrice = document.getElementById("new-price").value;
  const description = document.getElementById("new-desc").value;
  const photoInput = document.getElementById("new-business-photo");

  const formData = new FormData();
  formData.append("category", category);
  formData.append("title", title);
  formData.append("basePrice", Number(basePrice));
  formData.append("description", description);
  
  if (photoInput.files[0]) {
    formData.append("businessPhoto", photoInput.files[0]);
  }

  try {
    Ui.toast("info", "Updating", "Saving changes...");
    await EdelModules.api.put(
      `/api/services/${id}`,
      formData,
      {
        headers: EdelModules.auth.getAuthHeaders(),
        silent: true,
      },
    );

    Ui.toast("success", "Service Updated", "Changes saved successfully.");
    closeModals();
    refreshDashboard();

    // Reset modal
    const modalTitle = document.querySelector("#modal-add-service h3");
    const saveBtn = document.getElementById("btn-save-service");
    modalTitle.innerText = "Add New Service";
    saveBtn.innerText = "Add Service";
    saveBtn.setAttribute("onclick", "saveNewService()");
    const photoLabel = document.getElementById("photo-upload-label");
    if (photoLabel) photoLabel.innerText = "Upload Business Photo";
  } catch (error) {
    Ui.toast("error", "Update Failed", error.message);
  }
}

function viewServiceDetails(id) {
  const user = EdelModules.auth.getUser();
  const service = user.services.find((s) => s.id === id);
  if (!service) return;

  // Populate Details Modal
  const isDisabled = service.serviceStatus === 'disabled';
  
  const detailPhoto = document.getElementById("detail-photo");
  if (detailPhoto) {
    detailPhoto.src = EdelModules.api.buildUrl(service.businessPhoto || "/assets/images/business-photo-default.jpg");
  }

  document.getElementById("detail-category").innerText = service.category;
  document.getElementById("detail-title").innerText = service.title;
  document.getElementById("detail-price").innerText = `₦${Number(service.basePrice).toLocaleString()}`;
  document.getElementById("detail-desc").innerText = service.description;

  const statusContainer = document.getElementById("detail-price").parentElement.nextElementSibling;
  if (statusContainer) {
    if (isDisabled) {
      statusContainer.innerHTML = `
        <div class="flex flex-col gap-1">
          <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Status</p>
          <p class="text-sm font-bold text-red-600 flex items-center gap-1">
            <i data-lucide="ban" class="w-4 h-4"></i> Disabled
          </p>
          ${service.disabledReason ? `<p class="text-[10px] text-red-400 font-medium italic mt-1 leading-tight">"${service.disabledReason}"</p>` : ''}
        </div>
      `;
    } else {
      statusContainer.innerHTML = `
        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Status</p>
        <p class="text-sm font-bold text-green-600 flex items-center gap-1">
          <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Active
        </p>
      `;
    }
  }

  // Setup Edit Button in Details
  const editBtn = document.getElementById("btn-edit-from-detail");
  if (isDisabled) {
    editBtn.classList.add("hidden");
  } else {
    editBtn.classList.remove("hidden");
    editBtn.onclick = () => {
      closeModals();
      setTimeout(() => editService(id), 350);
    };
  }

  openModal("modal-service-details");
  Edel.initIcons();
}

function openModal(modalId) {
  const overlay = document.getElementById("modal-overlay");
  const modal = document.getElementById(modalId);

  if (currentOpenModal && currentOpenModal !== modal) {
    currentOpenModal.classList.add("hidden");
    currentOpenModal.classList.remove("flex", "scale-100", "opacity-100");
  }

  overlay.classList.remove("hidden", "opacity-0");
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  setTimeout(() => {
    modal.classList.remove("scale-95", "opacity-0");
    modal.classList.add("scale-100", "opacity-100");
  }, 10);

  currentOpenModal = modal;
  Edel.initIcons();
}

function closeModals() {
  const overlay = document.getElementById("modal-overlay");

  if (currentOpenModal) {
    currentOpenModal.classList.remove("scale-100", "opacity-100");
    currentOpenModal.classList.add("scale-95", "opacity-0");
  }

  overlay.classList.add("opacity-0");

  setTimeout(() => {
    overlay.classList.add("hidden");

    if (currentOpenModal) {
      currentOpenModal.classList.add("hidden");
      currentOpenModal.classList.remove("flex");
      currentOpenModal = null;
    }
  }, 300);
}

document.getElementById("modal-overlay").addEventListener("click", function (e) {
  if (e.target === this) {
    closeModals();
  }
});

// Expose functions for onclick attributes
window.updateProviderStatus = updateProviderStatus;
window.saveNewService = saveNewService;
window.deleteService = deleteService;
window.editService = editService;
window.updateService = updateService;
window.viewServiceDetails = viewServiceDetails;
window.openModal = openModal;
window.closeModals = closeModals;
window.setView = setView;
window.updateProfile = updateProfile;
window.updatePreferences = updatePreferences;
window.updatePassword = updatePassword;
window.deleteAccount = deleteAccount;
window.submitProviderUpgrade = submitProviderUpgrade;

// Profile Photo Update
const photoInput = document.createElement("input");
photoInput.type = "file";
photoInput.accept = "image/*";
photoInput.className = "hidden";
document.body.appendChild(photoInput);

const editPhotoBtn = document.getElementById("edit-profile-photo-btn");
if (editPhotoBtn) {
  editPhotoBtn.addEventListener("click", () => photoInput.click());
}

photoInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("profilePhoto", file);

  try {
    Ui.toast("info", "Uploading...", "Updating your profile picture.");
    const response = await EdelModules.api.put("/api/profile/photo", formData, {
      headers: EdelModules.auth.getAuthHeaders(),
      silent: true,
    });

    Ui.toast("success", "Photo Updated", "Your profile picture has been changed.");
    
    // Update local user data
    const user = EdelModules.auth.getUser();
    if (user) {
      user.profilePhoto = response.profilePhoto;
      EdelModules.auth.setUser(user);
      hydrateProfile(user);
    }
  } catch (error) {
    Ui.toast("error", "Upload Failed", error.message);
  }
});
