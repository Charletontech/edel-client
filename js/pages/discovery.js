Edel.initIcons();
Edel.applySafeArea();

if (!EdelModules.auth.requireAuth()) {
  throw new Error("Authentication required");
}

const locationText = document.getElementById("location-text");
const locationBtn = document.getElementById("location-btn");
const tabCustomer = document.getElementById("tab-customer");
const tabProvider = document.getElementById("tab-provider");
const listingsContainer = document.getElementById("listings-container");
const searchInput = document.getElementById("search-input");
const categoryList = document.getElementById("category-list");
const modal = document.getElementById("listing-modal");
const modalContent = document.getElementById("modal-content");
const modalActionBtn = document.getElementById("modal-action-btn");
const modalWarning = document.getElementById("modal-warning");
const modalTitle = document.getElementById("modal-title");
const modalCategory = document.getElementById("modal-category");
const modalProviderName = document.getElementById("modal-provider-name");
const modalDescription = document.getElementById("modal-description");
const modalDistance = document.getElementById("modal-distance");
const modalPrice = document.getElementById("modal-price");
const modalImg = document.getElementById("modal-img");

const reportsModal = document.getElementById("reports-modal");
const reportsListContainer = document.getElementById("reports-list-container");
const notificationsBtnMobile = document.getElementById("notifications-btn-mobile");
const notificationsBtnDesktop = document.getElementById("notifications-btn-desktop");
const notificationDotMobile = document.getElementById("notification-dot-mobile");
const notificationDotDesktop = document.getElementById("notification-dot-desktop");

const modalController = EdelModules.ui.createOverlayModal({
  overlay: modal,
  defaultPanelClass: "flex",
});

const reportsModalController = EdelModules.ui.createOverlayModal({
  overlay: reportsModal,
  defaultPanelClass: "flex",
});

const customerTabClass =
  "flex-1 lg:px-6 py-2 rounded-lg bg-white text-brand-navy font-bold text-sm shadow-sm transition-all";
const providerTabClass =
  "flex-1 lg:px-6 py-2 rounded-lg text-slate-500 font-medium text-sm hover:text-brand-navy transition-all";

const providerViewMarkup = `
  <div class="bg-brand-navy rounded-3xl p-6 text-white shadow-soft col-span-1 md:col-span-2 xl:col-span-3 flex flex-col items-center justify-center text-center py-12">
    <div class="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
      <i data-lucide="radar" class="w-8 h-8 text-brand-accent"></i>
    </div>
    <h3 class="text-xl font-bold mb-2">Customer request feed is next</h3>
    <p class="text-slate-400 max-w-md">Discovery for providers will become active when the order request flow lands. Customers can already browse nearby providers with live data.</p>
  </div>
`;

const state = {
  activeTab: "customer",
  selectedCategory: "all",
  search: "",
  location: null,
  currentItems: [],
  selectedItem: null,
  requestController: null,
  viewMode: "list", // 'list' or 'categories'
};

const categoryIcons = {
  Cleaning: "sparkles",
  Repairs: "wrench",
  Beauty: "scissors",
  Tutoring: "book-open",
  "Tech Help": "laptop",
  Laundry: "droplets",
  Health: "activity",
  Transport: "car",
  Food: "utensils",
  Default: "briefcase",
};

function getCategoryIcon(category) {
  return categoryIcons[category] || categoryIcons["Default"];
}

function setActiveTab(activeTab) {
  state.activeTab = activeTab;
  EdelModules.ui.setClassName(
    tabCustomer,
    activeTab === "customer" ? customerTabClass : providerTabClass,
  );
  EdelModules.ui.setClassName(
    tabProvider,
    activeTab === "provider" ? customerTabClass : providerTabClass,
  );
}

function formatDistance(distanceKm) {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m away`;
  }

  return `${distanceKm.toFixed(1)} km away`;
}

function formatCurrency(amount) {
  return `₦${Number(amount || 0).toLocaleString()}`;
}

function getTierBadgeIcon(tier) {
  return tier === "rookie" ? "leaf" : "check";
}

function getStatusBadge(status) {
  if (status === "busy") {
    return `
      <span class="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
        <i data-lucide="clock" class="w-3 h-3"></i> Busy
      </span>
    `;
  }

  if (status === "unavailable") {
    return `
      <span class="bg-slate-100 text-slate-500 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
        <i data-lucide="moon" class="w-3 h-3"></i> Unavailable
      </span>
    `;
  }

  return `
    <span class="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
      <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
      Available
    </span>
  `;
}

function getProviderBrowseBanner() {
  return `
    <div class="col-span-full mb-4">
      <div class="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3 shadow-sm">
        <div class="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
          <i data-lucide="eye" class="w-5 h-5 text-amber-700"></i>
        </div>
        <div>
          <h3 class="font-bold text-amber-900">Provider browse mode</h3>
          <p class="text-sm text-amber-800/80 mt-1">
            You can review nearby services and categories here, but requests are disabled for provider accounts.
          </p>
        </div>
      </div>
    </div>
  `;
}

function buildCardMarkup(item) {
  const profilePhoto = EdelModules.api.buildUrl(
    item.provider.profilePhoto || "/assets/images/avatar.jpg",
  );
  const providerBrowseMode = state.activeTab === "provider";

  return `
    <div
      class="bg-white rounded-3xl p-5 border border-slate-100 shadow-soft transition-all duration-300 ${providerBrowseMode ? "group ring-1 ring-amber-100" : "hover:-translate-y-1 cursor-pointer group"}"
      data-service-id="${item.id}"
    >
      ${providerBrowseMode ? `
        <div class="mb-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold uppercase tracking-wider">
          <i data-lucide="eye" class="w-3.5 h-3.5"></i>
          View Only
        </div>
      ` : ''}
      <div class="flex justify-between items-start mb-4">
        <div class="flex gap-3 items-center">
          <div class="relative">
            <img
              src="${profilePhoto}"
              alt="${item.provider.fullName}"
              class="w-14 h-14 rounded-2xl object-cover shadow-sm"
            />
            <div
              class="absolute -bottom-1 -right-1 w-5 h-5 verified-badge rounded-full flex items-center justify-center border-2 border-white shadow-sm"
              title="${item.provider.tier || "rookie"} tier"
            >
              <i data-lucide="${getTierBadgeIcon(item.provider.tier)}" class="w-3 h-3 text-white"></i>
            </div>
          </div>
          <div>
            <h4 class="font-bold text-brand-navy">${item.provider.fullName}</h4>
            <p class="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md inline-block mt-1">
              ${item.category}
            </p>
          </div>
        </div>
        ${getStatusBadge(item.provider.availabilityStatus)}
      </div>

      <h3 class="text-lg font-bold text-brand-navy mb-2 ${providerBrowseMode ? "" : "group-hover:text-brand-blue"} transition-colors">
        ${item.title}
      </h3>
      <p class="text-sm text-slate-500 mb-5 line-clamp-2">
        ${item.description}
      </p>

      <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
        <div>
          <p class="text-xs text-slate-400 mb-0.5">Starting from</p>
          <p class="text-lg font-extrabold text-brand-navy">${formatCurrency(item.basePrice)}</p>
        </div>
        <div class="text-right">
          <div class="flex items-center gap-1 text-brand-navy font-bold text-sm justify-end mb-1">
            <i data-lucide="star" class="w-3.5 h-3.5 fill-brand-accent text-brand-accent"></i>
            ${Math.round(item.provider.rating || 50)}%
          </div>
          <p class="text-xs font-semibold text-slate-500 flex items-center gap-1 justify-end">
            <i data-lucide="map-pin" class="w-3 h-3"></i> ${formatDistance(item.distanceKm)}
          </p>
        </div>
      </div>
    </div>
  `;
}

function renderLoadingState() {
  listingsContainer.innerHTML = Array.from({ length: 6 })
    .map(
      () => `
        <div class="bg-white rounded-3xl p-5 border border-slate-100 shadow-soft animate-pulse">
          <div class="flex justify-between items-start mb-4">
            <div class="flex gap-3 items-center">
              <div class="w-14 h-14 rounded-2xl bg-slate-200"></div>
              <div>
                <div class="h-4 w-28 bg-slate-200 rounded mb-2"></div>
                <div class="h-3 w-20 bg-slate-100 rounded"></div>
              </div>
            </div>
            <div class="h-6 w-20 bg-slate-100 rounded-full"></div>
          </div>
          <div class="h-5 w-3/4 bg-slate-200 rounded mb-3"></div>
          <div class="h-4 w-full bg-slate-100 rounded mb-2"></div>
          <div class="h-4 w-2/3 bg-slate-100 rounded mb-6"></div>
          <div class="pt-4 border-t border-slate-100 flex justify-between">
            <div class="h-10 w-24 bg-slate-100 rounded"></div>
            <div class="h-10 w-24 bg-slate-100 rounded"></div>
          </div>
        </div>
      `,
    )
    .join("");
}

function renderEmptyState(message) {
  listingsContainer.innerHTML = `
    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-soft text-center col-span-1 md:col-span-2 xl:col-span-3">
      <div class="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-4">
        <i data-lucide="search-x" class="w-8 h-8 text-brand-navy"></i>
      </div>
      <h3 class="text-xl font-bold text-brand-navy mb-2">No nearby services found</h3>
      <p class="text-slate-500 max-w-md mx-auto">${message}</p>
    </div>
  `;
  Edel.initIcons();
}

function renderLocationPermissionState() {
  listingsContainer.innerHTML = `
    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-soft text-center col-span-1 md:col-span-2 xl:col-span-3">
      <div class="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-4">
        <i data-lucide="map-pinned" class="w-8 h-8 text-brand-navy"></i>
      </div>
      <h3 class="text-xl font-bold text-brand-navy mb-2">Enable location access</h3>
      <p class="text-slate-500 max-w-lg mx-auto mb-6">
        You need to enable browser location access for the full E-del experience and to see nearby services around you.
      </p>
      <button
        type="button"
        id="retry-location-access"
        class="bg-brand-navy text-brand-accent px-6 py-3 rounded-xl font-bold hover:bg-brand-blue transition-colors"
      >
        Try Location Again
      </button>
    </div>
  `;
  Edel.initIcons();

  document
    .getElementById("retry-location-access")
    ?.addEventListener("click", () => {
      state.location = null;
      loadDiscoveryFeed().catch(() => {});
    });
}

function renderListings(items) {
  state.currentItems = items;
  const providerBrowseMode = state.activeTab === "provider";

  if (!items.length) {
    renderEmptyState(
      "Try a different search term, change category, or refresh your location.",
    );
    return;
  }

  listingsContainer.innerHTML = `
    ${providerBrowseMode ? getProviderBrowseBanner() : ""}
    ${items.map(buildCardMarkup).join("")}
  `;
  Edel.initIcons();
}

function updateHeaderForRole() {
  const user = EdelModules.auth.getUser();
  if (!user) return;

  const tabContainer = document.getElementById("tab-container");
  const singleRoleHeader = document.getElementById("single-role-header");
  const roleHeaderText = document.getElementById("role-header-text");
  const backBtn = document.getElementById("category-back-btn");

  const isDualRole = user.role === "both" || user.role === "admin";

  if (!isDualRole) {
    if (tabContainer) tabContainer.classList.add("hidden");
    if (singleRoleHeader) {
      singleRoleHeader.classList.remove("hidden");

      if (user.role === "customer") {
        roleHeaderText.textContent = "Trending Services";
        backBtn.classList.add("hidden");
      } else {
        // Provider role
        if (state.viewMode === "categories") {
          roleHeaderText.textContent = "Trending Categories";
          backBtn.classList.add("hidden");
        } else {
          roleHeaderText.textContent = `Trending ${state.selectedCategory}`;
          backBtn.classList.remove("hidden");
        }
      }
    }
  } else {
    // Dual Role (Both or Admin) - Show Tabs
    if (tabContainer) tabContainer.classList.remove("hidden");

    // Show header only if in provider category view
    if (singleRoleHeader) {
      if (state.activeTab === "provider" && state.viewMode === "list") {
        singleRoleHeader.classList.remove("hidden");
        roleHeaderText.textContent = `Trending ${state.selectedCategory}`;
        backBtn.classList.remove("hidden");
      } else {
        singleRoleHeader.classList.add("hidden");
      }
    }
  }
}

function renderCategoryGrid(categories) {
  if (!categories || !categories.length) {
    renderEmptyState("No categories available at the moment.");
    return;
  }

  listingsContainer.innerHTML = `
    ${state.activeTab === "provider" ? getProviderBrowseBanner() : `
      <div class="col-span-full mb-2">
        <h3 class="text-xl font-bold text-brand-navy">Trending Categories</h3>
        <p class="text-sm text-slate-500 mt-1">Select a category to see trending services around you</p>
      </div>
    `}
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 col-span-full mt-4">
      ${categories
        .map(
          (category) => `
        <div 
          data-category-card="${category}"
          class="bg-white rounded-3xl p-6 border border-slate-100 shadow-soft transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center group ${state.activeTab === "provider" ? "ring-1 ring-amber-100" : "hover:shadow-glow hover:-translate-y-1"}"
        >
          <div class="w-16 h-16 ${state.activeTab === "provider" ? "bg-amber-50" : "bg-brand-light"} rounded-2xl flex items-center justify-center mb-4 ${state.activeTab === "provider" ? "" : "group-hover:bg-brand-accent"} transition-colors">
            <i data-lucide="${getCategoryIcon(category)}" class="w-8 h-8 text-brand-navy"></i>
          </div>
          <h4 class="font-bold text-brand-navy text-sm ${state.activeTab === "provider" ? "" : "group-hover:text-brand-blue"} transition-colors">${category}</h4>
        </div>
      `,
        )
        .join("")}
    </div>
  `;
  Edel.initIcons();
}

function populateUserProfile() {
  const user = EdelModules.auth.getUser();
  if (!user) return;

  const sidebarName = document.getElementById("sidebar-user-name");
  const sidebarRole = document.getElementById("sidebar-role");
  const sidebarImg = document.getElementById("sidebar-user-img");
  const mobileImg = document.getElementById("mobile-user-img");

  if (sidebarName) sidebarName.textContent = user.fullName || "User";
  if (sidebarRole) {
    if (user.role === "both") sidebarRole.textContent = "Customer + Provider";
    else if (user.role === "provider")
      sidebarRole.textContent = "Provider Account";
    else sidebarRole.textContent = "Customer Account";
  }

  // Use a default avatar if none provided
  const profilePhoto = EdelModules.api.buildUrl(
    user.profilePhoto || "/assets/images/avatar.jpg",
  );
  if (sidebarImg) sidebarImg.src = profilePhoto;
  if (mobileImg) mobileImg.src = profilePhoto;

  updateHeaderForRole();
}

function renderCategories(categories = []) {
  if (!categoryList) return;

  const values = ["all", ...categories];
  categoryList.innerHTML = values
    .map((category) => {
      const active = state.selectedCategory === category;
      const label = category === "all" ? "All Near Me" : category;
      const className = active
        ? "px-5 py-2 bg-brand-navy text-white rounded-full text-sm font-bold whitespace-nowrap shadow-md"
        : "px-5 py-2 bg-white text-slate-600 border border-slate-200 rounded-full text-sm font-medium whitespace-nowrap hover:bg-slate-50 transition-colors";

      return `<button data-category="${category}" class="${className}">${label}</button>`;
    })
    .join("");
}

function openDiscoveryModal(serviceId) {
  const item = state.currentItems.find((entry) => String(entry.id) === String(serviceId));
  if (!item) return;
  state.selectedItem = item;
  const providerBrowseMode = state.activeTab === "provider";

  modalController.open(modalContent, {
    panelClass: "flex",
    hiddenPanelClasses: ["translate-y-full", "lg:translate-y-8"],
    visiblePanelClasses: ["translate-y-0"],
  });

  modalTitle.innerText = item.title;
  modalCategory.innerText = item.category;
  if (modalImg) {
    modalImg.src = EdelModules.api.buildUrl(
      item.provider.profilePhoto || "/assets/images/avatar.jpg",
    );
  }
  if (modalProviderName) modalProviderName.innerText = item.provider.fullName;
  if (modalDescription) modalDescription.innerText = item.description;
  if (modalDistance) modalDistance.innerHTML = `<i data-lucide="map-pin" class="w-4 h-4 text-brand-accent"></i> ${formatDistance(item.distanceKm)}`;
  if (modalPrice) modalPrice.innerText = formatCurrency(item.basePrice);
  Edel.initIcons();

  modalActionBtn.classList.remove(
    "bg-brand-navy",
    "text-brand-accent",
    "hover:bg-brand-blue",
    "bg-slate-200",
    "text-slate-500",
    "cursor-not-allowed",
  );

  if (providerBrowseMode) {
    modalActionBtn.classList.add("bg-slate-200", "text-slate-500", "cursor-not-allowed");
    modalActionBtn.innerText = "Browse Only";
    modalActionBtn.disabled = true;
    modalWarning.classList.remove("hidden");
    modalWarning.innerText = "Provider accounts can preview services only. Requests are disabled in this tab.";
    return;
  }

  if (item.provider.availabilityStatus !== "available") {
    modalActionBtn.classList.remove("bg-brand-navy", "text-brand-accent", "hover:bg-brand-blue");
    modalActionBtn.classList.add("bg-slate-200", "text-slate-500", "cursor-not-allowed");
    modalActionBtn.innerText =
      item.provider.availabilityStatus === "busy" ? "Provider Busy" : "Currently Unavailable";
    modalActionBtn.disabled = true;
    modalWarning.classList.remove("hidden");
    return;
  }

  modalActionBtn.classList.add("bg-brand-navy", "text-brand-accent", "hover:bg-brand-blue");
  modalActionBtn.innerText = "Request Service Now";
  modalActionBtn.disabled = false;
  modalWarning.classList.add("hidden");
}

async function requestSelectedService() {
  if (!state.selectedItem) return;
  if (state.activeTab === "provider") return;

  if (modalActionBtn) {
    modalActionBtn.disabled = true;
    modalActionBtn.innerHTML =
      '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Sending Request...';
    Edel.initIcons();
  }

  try {
    await EdelModules.api.post(
      "/api/orders",
      {
        serviceId: state.selectedItem.id,
      },
      {
        headers: EdelModules.auth.getAuthHeaders(),
        silent: true,
      },
    );

    Ui.toast("success", "Order Sent", "Your request has been sent to the provider.");
    window.setTimeout(() => {
      window.location.href = "/activities/";
    }, 900);
  } catch (error) {
    if (modalActionBtn) {
      modalActionBtn.disabled = false;
      modalActionBtn.innerText = "Request Service Now";
      Edel.initIcons();
    }

    Ui.toast("error", "Order Failed", error.message || "Could not place the order.");
  }
}

async function loadReports() {
  try {
    const response = await EdelModules.auth.fetchDashboard();
    const reports = response.reports || [];
    
    // Show/hide notification dots
    const hasUnresolved = reports.some(r => r.reportStatus === 'open');
    if (notificationDotMobile) notificationDotMobile.classList.toggle('hidden', !hasUnresolved);
    if (notificationDotDesktop) notificationDotDesktop.classList.toggle('hidden', !hasUnresolved);

    if (reports.length === 0) {
      reportsListContainer.innerHTML = `
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

    reportsListContainer.innerHTML = reports.map(report => {
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
  } catch (error) {
    console.error("Failed to load reports:", error);
  }
}

function openReportsModal() {
  reportsModalController.open(document.getElementById('reports-modal-content'), {
    panelClass: "flex",
    hiddenPanelClasses: ["translate-y-full", "lg:translate-y-8"],
    visiblePanelClasses: ["translate-y-0"],
  });
  loadReports();
}

function closeReportsModal() {
  reportsModalController.close({
    hiddenPanelClasses: ["translate-y-full", "lg:translate-y-8"],
    visiblePanelClasses: ["translate-y-0"],
  });
}

function getSavedLocationLabel() {
  return EdelModules.location.formatLocationLabel(
    EdelModules.auth.getUser()?.locationLabel,
    "Current location",
  );
}

async function syncUserLocation(position) {
  try {
    let currentLabel = getSavedLocationLabel();

    // If the label is generic or placeholder, try to resolve a real address
    if (EdelModules.location.isGenericLabel(currentLabel)) {
      const realAddress = await EdelModules.location.reverseGeocode(
        position.latitude,
        position.longitude,
      );
      if (realAddress) {
        currentLabel = realAddress;
        if (locationText) locationText.innerText = currentLabel;
      }
    }

    await EdelModules.api.put(
      "/api/location",
      {
        locationLabel: currentLabel,
        latitude: position.latitude,
        longitude: position.longitude,
      },
      {
        headers: EdelModules.auth.getAuthHeaders(),
        silent: true,
      },
    );

    const user = EdelModules.auth.getUser() || {};
    user.locationLabel = currentLabel;
    user.latitude = position.latitude;
    user.longitude = position.longitude;
    EdelModules.auth.setUser(user);
  } catch (error) {
    console.warn("Location sync skipped:", error.message);
  }
}

async function resolveViewerLocation() {
  try {
    const browserLocation = await EdelModules.location.getBestBrowserLocation({
      maxAcceptedAccuracy: EdelModules.location.minAcceptedAccuracy,
      timeout: 7000,
      maximumAge: 15000,
    });
    locationText.innerText = getSavedLocationLabel();
    await syncUserLocation(browserLocation);
    return browserLocation;
  } catch (error) {
    const cachedUser = EdelModules.auth.getUser();
    if (cachedUser?.latitude != null && cachedUser?.longitude != null) {
      locationText.innerText = EdelModules.location.formatLocationLabel(
        cachedUser.locationLabel,
        "Saved location",
      );

      return {
        latitude: Number(cachedUser.latitude),
        longitude: Number(cachedUser.longitude),
      };
    }

    if (error?.code === 1) {
      error.isLocationPermissionDenied = true;
    }

    throw error;
  }
}

async function loadDiscoveryFeed() {
  if (state.activeTab === "provider" && state.viewMode === "categories") {
    renderLoadingState();
    try {
      const response = await EdelModules.api.get(
        "/api/services/discovery?limit=1",
        {
          headers: EdelModules.auth.getAuthHeaders(),
          silent: true,
        },
      );
      renderCategoryGrid(response.categories || []);
      updateHeaderForRole();
    } catch (error) {
      renderEmptyState(error.message || "Could not load categories.");
    }
    return;
  }

  renderLoadingState();

  if (state.requestController) {
    state.requestController.abort();
  }

  state.requestController = new AbortController();

  try {
    if (!state.location) {
      state.location = await resolveViewerLocation();
    }

    const params = new URLSearchParams({
      role: "customer",
      lat: state.location.latitude,
      lng: state.location.longitude,
      limit: 24,
    });

    if (state.search) {
      params.set("search", state.search);
    }

    if (state.selectedCategory !== "all") {
      params.set("category", state.selectedCategory);
    }

    const response = await EdelModules.api.get(
      `/api/services/discovery?${params.toString()}`,
      {
        headers: EdelModules.auth.getAuthHeaders(),
        signal: state.requestController.signal,
        silent: true,
      },
    );

    renderCategories(response.categories || []);
    renderListings(response.services || []);
    updateHeaderForRole();
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    if (error.isLocationPermissionDenied) {
      renderLocationPermissionState();
      return;
    }

    if (error.isLowAccuracy) {
      renderEmptyState(
        "Your location signal is too weak right now. Please try again in a clearer signal area for the full E-del experience.",
      );
      return;
    }

    renderEmptyState(
      error.message || "We could not load nearby services right now.",
    );
  }
}

function debounce(fn, wait = 250) {
  let timeoutId;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), wait);
  };
}

locationBtn?.addEventListener("click", () => {
  state.location = null;
  loadDiscoveryFeed().catch(() => {});
});

tabCustomer?.addEventListener("click", () => {
  state.viewMode = "list";
  state.selectedCategory = "all";
  setActiveTab("customer");
  loadDiscoveryFeed().catch(() => {});
});

tabProvider?.addEventListener("click", () => {
  state.viewMode = "categories";
  state.selectedCategory = "all";
  setActiveTab("provider");
  loadDiscoveryFeed().catch(() => {});
});

searchInput?.addEventListener(
  "input",
  debounce((event) => {
    state.search = event.target.value.trim();
    loadDiscoveryFeed().catch(() => {});
  }),
);

categoryList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;

  state.selectedCategory = button.dataset.category || "all";
  state.viewMode = "list"; // If they use the pills, they want the list
  loadDiscoveryFeed().catch(() => {});
});

listingsContainer?.addEventListener("click", (event) => {
  const categoryCard = event.target.closest("[data-category-card]");
  if (categoryCard) {
    state.viewMode = "list";
    state.selectedCategory = categoryCard.dataset.categoryCard;
    loadDiscoveryFeed().catch(() => {});
    return;
  }

  const card = event.target.closest("[data-service-id]");
  if (!card) return;
  openDiscoveryModal(card.dataset.serviceId);
});

document.getElementById("category-back-btn")?.addEventListener("click", () => {
  state.viewMode = "categories";
  state.selectedCategory = "all";
  loadDiscoveryFeed().catch(() => {});
});

modal?.addEventListener("click", (event) => {
  if (event.target !== modal) return;
  modalController.close({
    hiddenPanelClasses: ["translate-y-full", "lg:translate-y-8"],
    visiblePanelClasses: ["translate-y-0"],
  });
});

modalActionBtn?.addEventListener("click", () => {
  requestSelectedService().catch(() => {});
});

notificationsBtnMobile?.addEventListener("click", openReportsModal);
notificationsBtnDesktop?.addEventListener("click", openReportsModal);
document.getElementById("close-reports-btn")?.addEventListener("click", closeReportsModal);
reportsModal?.addEventListener("click", (event) => {
  if (event.target === reportsModal) closeReportsModal();
});

window.closeModal = () =>
  modalController.close({
    hiddenPanelClasses: ["translate-y-full", "lg:translate-y-8"],
    visiblePanelClasses: ["translate-y-0"],
  });

window.addEventListener("load", () => {
  const user = EdelModules.auth.getUser();
  if (user && user.role === "provider") {
    state.activeTab = "provider";
    state.viewMode = "categories";
  } else {
    state.activeTab = "customer";
    state.viewMode = "list";
  }

  setActiveTab(state.activeTab);
  populateUserProfile();
  loadReports();
  loadDiscoveryFeed().catch((error) => {
    Ui.toast("error", "Discovery Unavailable", error.message);
  });
});
