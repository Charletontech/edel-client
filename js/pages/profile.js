Edel.initIcons();
Edel.applySafeArea();

if (!EdelModules.auth.requireAuth()) {
  throw new Error("Authentication required");
}

const customerRoleTagClass =
  "bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-full self-center md:self-auto uppercase tracking-wide";
const providerRoleTagClass =
  "bg-brand-accent text-brand-navy text-xs font-bold px-3 py-1 rounded-full self-center md:self-auto shadow-sm tracking-wide";

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
};

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

  const isProviderRole = user.role === "provider" || user.role === "both";
  const fullName = user.fullName || "Edel User";

  profileElements.name.innerText = fullName;
  
  // Logic for initial display (will be refined by setView)
  profileElements.roleTag.innerText = user.role === "provider" ? "Rookie Tier" : "Customer";
  profileElements.roleTag.className = user.role === "provider"
    ? providerRoleTagClass
    : customerRoleTagClass;

  // Rating logic
  const rating = user.rating || (user.role === "provider" ? 50 : 100);
  const ratingTrend = rating >= (user.role === "provider" ? 50 : 100)
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

  // If role is 'both', we default to provider view if they just upgraded, 
  // otherwise we try to stay in their current view if setView is smart enough.
  const currentView = document.getElementById("provider-sections")?.classList.contains("hidden") ? "customer" : "provider";
  const targetView = user.role === "provider" ? "provider" : (user.role === "both" ? currentView : "customer");
  
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
      (service) => `
    <div class="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-brand-accent transition-all relative hover:z-50">
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 bg-brand-light rounded-xl flex items-center justify-center">
          <i data-lucide="${getIconForCategory(service.category)}" class="w-5 h-5 text-brand-navy"></i>
        </div>
        <div>
          <h4 class="font-bold text-brand-navy text-sm">${service.title}</h4>
          <p class="text-xs text-slate-500">₦${Number(service.basePrice).toLocaleString()} Base • ${service.category}</p>
        </div>
      </div>
      <div class="relative group">
        <button class="text-slate-400 hover:text-brand-navy p-2">
          <i data-lucide="more-vertical" class="w-5 h-5"></i>
        </button>
        <div class="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-100 hidden group-hover:block z-50">
          <button onclick="viewServiceDetails(${service.id})" class="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 first:rounded-t-xl">Details</button>
          <button onclick="editService(${service.id})" class="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Edit</button>
          <button onclick="deleteService(${service.id})" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 last:rounded-b-xl">Delete</button>
        </div>
      </div>
    </div>
  `,
    )
    .join("");

  Edel.initIcons();
}

function getIconForCategory(category) {
  const icons = {
    cleaning: "sparkles",
    repairs: "wrench",
    beauty: "scissors",
    tutoring: "book-open",
    laundry: "shirt",
  };
  return icons[category.toLowerCase()] || "package";
}

const cachedUser = EdelModules.auth.getUser();
if (cachedUser) {
  hydrateProfile(cachedUser);
  showPostAuthNotifications(cachedUser);
}

function showPostAuthNotifications(user) {
  try {
    const justLoggedIn = localStorage.getItem("edel_just_logged_in");
    const justSignedUp = localStorage.getItem("edel_just_signed_up");

    if (justLoggedIn) {
      localStorage.removeItem("edel_just_logged_in");
      Ui.alert(
        "success",
        "Signed In",
        `Welcome back, ${user?.fullName || "Edel User"}!`,
      );
      return;
    }

    if (justSignedUp) {
      localStorage.removeItem("edel_just_signed_up");
      Ui.toast(
        "success",
        "Account Created",
        `Welcome ${user?.fullName || "to Edel"}!`,
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
      EdelModules.auth.setUser(response.user);
      hydrateProfile(response.user);
      return response.user;
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

profileElements.logoutButton?.addEventListener("click", () => {
  EdelModules.auth.logout();
});

function setView(viewType) {
  const currentUser = EdelModules.auth.getUser() || {};
  const currentRole = currentUser.role || "customer";

  if (currentRole !== "both" && currentRole !== viewType) {
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
  const fullName = currentUser.fullName || "Edel User";

  const activeClass =
    "px-6 py-2 rounded-lg bg-brand-navy text-brand-accent font-bold text-sm shadow-sm transition-all flex-1 md:flex-none";
  const inactiveClass =
    "px-6 py-2 rounded-lg text-slate-500 font-bold text-sm hover:text-brand-navy transition-all flex-1 md:flex-none opacity-60"; // Added opacity for greyed out effect

  if (viewType === "customer") {
    if (btnCustDes) btnCustDes.className = activeClass;
    if (btnCustMob) btnCustMob.className = activeClass;
    if (btnProvDes) btnProvDes.className = inactiveClass;
    if (btnProvMob) btnProvMob.className = inactiveClass;

    profileName.innerText = fullName;
    profileRoleTag.innerText = "Customer";
    profileRoleTag.className = customerRoleTagClass;
    profileRating.innerHTML =
      '100% <i data-lucide="trending-up" class="w-4 h-4 text-green-500"></i>';
    profileAvatar.src =
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80";

    profileBadge.classList.add("hidden");
    metricCompleted.classList.add("hidden");
    providerSections.classList.add("hidden");
  } else {
    if (btnProvDes) btnProvDes.className = activeClass;
    if (btnProvMob) btnProvMob.className = activeClass;
    if (btnCustDes) btnCustDes.className = inactiveClass;
    if (btnCustMob) btnCustMob.className = inactiveClass;

    profileName.innerText = fullName;
    profileRoleTag.innerText = "Rookie Tier";
    profileRoleTag.className = providerRoleTagClass;

    const rating = currentUser.rating || 50;
    profileRating.innerHTML = `${rating}% <i data-lucide="minus" class="w-4 h-4 text-slate-400"></i>`;
    profileAvatar.src =
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=200&q=80";

    profileBadge.classList.remove("hidden");
    metricCompleted.classList.remove("hidden");
    providerSections.classList.remove("hidden");
  }

  syncProfileInputs(currentUser);
  Edel.initIcons();
}

async function upgradeAccount(targetRole, payload = {}) {
  try {
    const response = await EdelModules.api.post("/api/upgrade", {
      targetRole,
      ...payload
    }, {
      headers: EdelModules.auth.getAuthHeaders()
    });

    Ui.toast("success", "Account Upgraded", response.message);
    
    // Update local user session
    const currentUser = EdelModules.auth.getUser();
    currentUser.role = 'both';
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

  if (!serviceCategory || !serviceTitle || !basePrice || !serviceDescription) {
    Ui.toast("warning", "Missing Fields", "Please fill all fields to upgrade.");
    return;
  }

  await upgradeAccount('provider', {
    serviceCategory,
    serviceTitle,
    basePrice,
    serviceDescription
  });
}

async function updateProviderStatus(selectElement) {
  const newStatus = selectElement.value;

  try {
    await EdelModules.api.put(
      "/api/status",
      { status: newStatus },
      {
        headers: EdelModules.auth.getAuthHeaders(),
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
async function saveNewService() {
  const category = document.getElementById("new-category").value;
  const title = document.getElementById("new-title").value;
  const basePrice = document.getElementById("new-price").value;
  const description = document.getElementById("new-desc").value;

  if (!category || !title || !basePrice || !description) {
    Ui.toast("warning", "Missing Info", "Please fill all fields");
    return;
  }

  try {
    await EdelModules.api.post(
      "/api/services",
      {
        category,
        title,
        basePrice: Number(basePrice),
        description,
      },
      {
        headers: EdelModules.auth.getAuthHeaders(),
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
    });

    Ui.toast("success", "Service Deleted", "The service has been removed.");
    refreshDashboard();
  } catch (error) {
    Ui.toast("error", "Delete Failed", error.message);
  }
}

function editService(id) {
  const user = EdelModules.auth.getUser();
  const service = user.services.find((s) => s.id === id);

  if (!service) return;

  // Fill "Add Service" modal with data and change its behavior
  document.getElementById("new-category").value = service.category;
  document.getElementById("new-title").value = service.title;
  document.getElementById("new-price").value = service.basePrice;
  document.getElementById("new-desc").value = service.description;

  const modalTitle = document.querySelector("#modal-add-service h3");
  const saveBtn = document.querySelector(
    "#modal-add-service button:not([onclick='closeModals()'])",
  );

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

  try {
    await EdelModules.api.put(
      `/api/services/${id}`,
      {
        category,
        title,
        basePrice: Number(basePrice),
        description,
      },
      {
        headers: EdelModules.auth.getAuthHeaders(),
      },
    );

    Ui.toast("success", "Service Updated", "Changes saved successfully.");
    closeModals();
    refreshDashboard();

    // Reset modal
    const modalTitle = document.querySelector("#modal-add-service h3");
    const saveBtn = document.querySelector(
      "#modal-add-service button:not([onclick='closeModals()'])",
    );
    modalTitle.innerText = "Add New Service";
    saveBtn.innerText = "Add Service";
    saveBtn.setAttribute("onclick", "saveNewService()");
  } catch (error) {
    Ui.toast("error", "Update Failed", error.message);
  }
}

function viewServiceDetails(id) {
  const user = EdelModules.auth.getUser();
  const service = user.services.find((s) => s.id === id);
  if (!service) return;

  // Populate Details Modal
  const icon = getIconForCategory(service.category);
  document.getElementById("detail-icon").setAttribute("data-lucide", icon);
  document.getElementById("detail-category").innerText = service.category;
  document.getElementById("detail-title").innerText = service.title;
  document.getElementById("detail-price").innerText = `₦${Number(service.basePrice).toLocaleString()}`;
  document.getElementById("detail-desc").innerText = service.description;

  // Setup Edit Button in Details
  const editBtn = document.getElementById("btn-edit-from-detail");
  editBtn.onclick = () => {
    closeModals();
    setTimeout(() => editService(id), 350);
  };

  openModal("modal-service-details");
  Edel.initIcons();
}

let currentOpenModal = null;

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
