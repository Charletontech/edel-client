let _settingsLoaded = false;
let _enableCategoriesViewForProviders = false;
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
const modalJobsDone = document.getElementById("modal-jobs-done");

const reportsModal = document.getElementById("reports-modal");
const reportsListContainer = document.getElementById("reports-list-container");
const notificationsBtnMobile = document.getElementById("notifications-btn-mobile");
const notificationsBtnDesktop = document.getElementById("notifications-btn-desktop");
const notificationDotMobile = document.getElementById("notification-dot-mobile");
const notificationDotDesktop = document.getElementById("notification-dot-desktop");

const faceModal = document.getElementById("face-verification-modal");
const faceModalContent = document.getElementById("face-modal-content");
const closeFaceModalBtn = document.getElementById("close-face-modal-btn");
const disclaimerContainer = document.getElementById("verification-disclaimer-container");

const modalController = EdelModules.ui.createOverlayModal({
  overlay: modal,
  defaultPanelClass: "flex",
});

const reportsModalController = EdelModules.ui.createOverlayModal({
  overlay: reportsModal,
  defaultPanelClass: "flex",
});

const faceModalController = EdelModules.ui.createOverlayModal({
  overlay: faceModal,
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

function getViewerRole(user = EdelModules.auth.getUser()) {
  if (!user) return "customer";
  if (user.role === "admin") return "admin";
  if (user.role === "both") return EdelModules.auth.getSessionRole(user) || "customer";
  return user.role || "customer";
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

function getVerifiedBadgeMarkup(provider, sizeClass = "w-3.5 h-3.5") {
  if (!provider?.hasPaidAccessFee) return "";

  return `
    <div
      class="absolute -bottom-0.5 -right-0.5 ${sizeClass} verified-badge rounded-full flex items-center justify-center border border-white shadow-sm"
      title="Verified provider"
    >
      <i data-lucide="check" class="w-1.5 h-1.5 text-white"></i>
    </div>
  `;
}

function getStatusBadge(status) {
  if (status === "busy") {
    return `
      <span class="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
        <i data-lucide="clock" class="w-3 h-3"></i> Busy
      </span>
    `;
  }

  if (status === "away" || status === "unavailable") {
    return `
      <span class="bg-slate-100 text-slate-500 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
        <i data-lucide="moon" class="w-3 h-3"></i> Away
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
  const businessPhoto = EdelModules.api.buildUrl(
    item.businessPhoto || "/assets/images/business-photo-default.jpg",
  );
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
      
      <!-- Business Photo Banner -->
      <div class="relative w-full h-32 mb-4 overflow-hidden rounded-2xl">
        <img
          src="${businessPhoto}"
          alt="${item.title}"
          class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
        <div class="absolute bottom-3 left-3 flex items-center gap-2">
          <div class="relative">
            <img
              src="${profilePhoto}"
              alt="${item.provider.fullName}"
              class="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
            />
            ${getVerifiedBadgeMarkup(item.provider)}
          </div>
          <span class="text-white text-xs font-bold shadow-sm">${item.provider.fullName}</span>
        </div>
      </div>

      <div class="flex justify-between items-start mb-2">
        <p class="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">
          ${item.category}
        </p>
        ${getStatusBadge(item.provider.availabilityStatus)}
      </div>

      <h3 class="text-lg font-bold text-brand-navy mb-2 ${providerBrowseMode ? "" : "group-hover:text-brand-blue"} transition-colors line-clamp-1">
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
  const isSearchEmpty = state.search && state.search.trim().length > 0;
  
  if (isSearchEmpty) {
    message = "We couldn't find any exact matches for your search.";
  }

  const extraHtml = `
    <div class="mt-6 p-6 bg-brand-light/50 rounded-2xl border border-brand-light">
      <h4 class="font-bold text-brand-navy mb-2">Or invite someone in this area to join E-del</h4>
      <p class="text-sm text-slate-500 mb-4">Sharing your invite link helps build the community in your local area.</p>
      <button onclick="handleInviteProvider()" class="group relative w-full bg-brand-navy text-brand-accent px-6 py-3.5 rounded-xl font-bold transition-all duration-300 hover:bg-brand-blue hover:shadow-lg hover:shadow-brand-navy/30 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3 overflow-hidden border border-brand-navy/20">
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
        <div class="p-1.5 bg-white/10 rounded-lg group-hover:scale-110 group-hover:bg-white/20 transition-all duration-300">
          <i data-lucide="link" class="w-4 h-4 text-brand-accent"></i>
        </div>
        <span class="relative z-10 tracking-wide text-[15px]">Copy Invite Link</span>
      </button>
    </div>
  `;

  listingsContainer.innerHTML = `
    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-soft text-center col-span-1 md:col-span-2 xl:col-span-3">
      <div class="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-4">
        <i data-lucide="search-x" class="w-8 h-8 text-brand-navy"></i>
      </div>
      <h3 class="text-xl font-bold text-brand-navy mb-2">No nearby services found</h3>
      <p class="text-slate-500 max-w-md mx-auto">${message}</p>
      ${extraHtml}
    </div>
  `;
  Edel.initIcons();
}

window.handleInviteProvider = async () => {
  const signupLink = window.location.origin + "/auth/?tab=signup";
  const shareData = {
    title: 'Join E-del as a Provider',
    text: "Hey! I couldn't find a provider for a service I need. Join E-del and offer your services!",
    url: signupLink
  };

  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
      Ui.toast('success', 'Shared', 'Thanks for sharing E-del!');
    } catch (err) {
      if (err.name !== 'AbortError') {
        copyInviteLink(signupLink);
      }
    }
  } else {
    copyInviteLink(signupLink);
  }
};

function copyInviteLink(link) {
  navigator.clipboard.writeText(link).then(() => {
    Ui.alert('success', 'Link Copied', 'A link to sign up has been copied! Share it with someone in the area to join E-del.', true, false);
  }).catch(() => {
    Ui.alert('error', 'Action Required', 'Could not copy automatically. Please copy this link: ' + link, true, false);
  });
}

function renderLocationPermissionState() {
  listingsContainer.innerHTML = `
    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-soft text-center col-span-1 md:col-span-2 xl:col-span-3">
      <div class="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-4">
        <i data-lucide="map-pinned" class="w-8 h-8 text-brand-navy"></i>
      </div>
      <h3 class="text-xl font-bold text-brand-navy mb-2">Set your location</h3>
      <p class="text-slate-500 max-w-lg mx-auto mb-6">
        We couldn't detect your location automatically. Allow location access or enter your area manually below.
      </p>
      <div class="flex flex-col items-center gap-3 max-w-sm mx-auto">
        <button
          type="button"
          id="retry-location-access"
          class="w-full bg-brand-navy text-brand-accent px-6 py-3 rounded-xl font-bold hover:bg-brand-blue transition-colors"
        >
          Try Location Again
        </button>
        <div class="w-full">
          <input
            id="discovery-manual-location-input"
            type="text"
            placeholder="Or type your city (e.g. Yaba, Lagos)"
            class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
          />
          <p id="discovery-manual-location-status" class="text-xs text-slate-400 mt-2"></p>
        </div>
      </div>
    </div>
  `;
  Edel.initIcons();

  document
    .getElementById("retry-location-access")
    ?.addEventListener("click", () => {
      state.location = null;
      loadDiscoveryFeed().catch(() => {});
    });

  // Wire manual location input
  const manualInput  = document.getElementById('discovery-manual-location-input');
  const manualStatus = document.getElementById('discovery-manual-location-status');
  if (!manualInput) return;

  const updateStatus = (html) => {
    if (manualStatus) {
      manualStatus.innerHTML = html;
      if (window.lucide) window.lucide.createIcons({ root: manualStatus });
    }
  };

  let debounceTimer;
  manualInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const query = manualInput.value.trim();
    if (!query) { updateStatus(''); return; }

    debounceTimer = setTimeout(async () => {
      updateStatus('<span class="flex items-center gap-1 text-brand-navy"><i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> Searching...</span>');
      try {
        const data = await EdelModules.location.geocodeQuery(query);
        if (!data.success || !data.location) {
          updateStatus(`<span class="flex items-center gap-1 text-red-500"><i data-lucide="x-circle" class="w-3.5 h-3.5"></i> Could not find "${query}". Try a nearby city.</span>`);
          return;
        }
        const loc = data.location;
        const confirmed = await Ui.alert('question', 'Location Found', `📍 ${loc.label || loc.city}. Use this location?`, true, true);
        if (confirmed && confirmed.isConfirmed) {
          state.location = { latitude: loc.lat, longitude: loc.lng, city: loc.city, source: 'manual' };
          if (locationText) locationText.innerText = loc.city || loc.label;
          // Silently save to profile
          EdelModules.api.put('/api/location', { locationLabel: loc.city || loc.label, latitude: loc.lat, longitude: loc.lng }, { headers: EdelModules.auth.getAuthHeaders(), silent: true }).catch(() => {});
          const user = EdelModules.auth.getUser() || {};
          user.locationLabel = loc.city || loc.label;
          user.latitude = loc.lat;
          user.longitude = loc.lng;
          EdelModules.auth.setUser(user);
          loadDiscoveryFeed().catch(() => {});
          updateStatus('<span class="flex items-center gap-1 text-green-600"><i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> Location saved.</span>');
        } else {
          updateStatus('<span class="flex items-center gap-1 text-amber-600"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Try a different search term.</span>');
          manualInput.value = '';
        }
      } catch (err) {
        updateStatus('<span class="flex items-center gap-1 text-red-500"><i data-lucide="wifi-off" class="w-3.5 h-3.5"></i> Search failed. Check your connection.</span>');
      }
    }, 1200); // 1.2s typing debounce to match auth.js
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

  checkVerificationDisclaimer();

  const tabContainer = document.getElementById("tab-container");
  const singleRoleHeader = document.getElementById("single-role-header");
  const roleHeaderText = document.getElementById("role-header-text");
  const backBtn = document.getElementById("category-back-btn");

  const effectiveRole = getViewerRole(user);
  const isAdmin = user.role === "admin";

  if (!isAdmin) {
    if (tabContainer) tabContainer.classList.add("hidden");
    if (singleRoleHeader) {
      singleRoleHeader.classList.remove("hidden");

      if (effectiveRole === "customer" || (effectiveRole === "provider" && !_enableCategoriesViewForProviders)) {
        roleHeaderText.textContent = "";
        const line = document.getElementById("role-header-line");
        if (line) line.classList.add("hidden");
        backBtn.classList.add("hidden");
      } else {
        const line = document.getElementById("role-header-line");
        if (line) line.classList.remove("hidden");
        if (effectiveRole === "provider" && state.viewMode === "categories") {
          // roleHeaderText.textContent = "Trending Categories";
          backBtn.classList.add("hidden");
        } else {
          roleHeaderText.textContent = `Trending ${state.selectedCategory}`;
          backBtn.classList.remove("hidden");
        }
      }
    }
  } else {
    if (tabContainer) tabContainer.classList.remove("hidden");

    if (singleRoleHeader) {
      const line = document.getElementById("role-header-line");
      if (state.activeTab === "provider" && state.viewMode === "list") {
        singleRoleHeader.classList.remove("hidden");
        roleHeaderText.textContent = `Trending ${state.selectedCategory}`;
        if (line) line.classList.remove("hidden");
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
          data-category-card="${category.name}"
          class="bg-white rounded-3xl p-6 border border-slate-100 shadow-soft transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center group ${state.activeTab === "provider" ? "ring-1 ring-amber-100" : "hover:shadow-glow hover:-translate-y-1"}"
        >
          <div class="w-16 h-16 ${state.activeTab === "provider" ? "bg-amber-50" : "bg-brand-light"} rounded-2xl flex items-center justify-center mb-4 ${state.activeTab === "provider" ? "" : "group-hover:bg-brand-accent"} transition-colors">
            <i data-lucide="${category.iconName || 'package'}" class="w-8 h-8 text-brand-navy"></i>
          </div>
          <h4 class="font-bold text-brand-navy text-sm capitalize ${state.activeTab === "provider" ? "" : "group-hover:text-brand-blue"} transition-colors">${category.name}</h4>
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
    sidebarRole.textContent = EdelModules.auth.getRoleLabel(user);
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

  const allOption = { name: "all", iconName: "compass" };
  const values = [allOption, ...categories];
  categoryList.innerHTML = values
    .map((category) => {
      const active = state.selectedCategory === category.name;
      const label = category.name === "all" ? "All Near Me" : category.name;
      const className = active
        ? "px-5 py-2 bg-brand-navy text-white rounded-full text-sm font-bold whitespace-nowrap shadow-md flex items-center gap-2"
        : "px-5 py-2 bg-white text-slate-600 border border-slate-200 rounded-full text-sm font-medium whitespace-nowrap hover:bg-slate-50 transition-colors flex items-center gap-2";

      return `<button data-category="${category.name}" class="${className}">
        <i data-lucide="${category.iconName || 'package'}" class="w-4 h-4"></i> <span class="capitalize">${label}</span>
      </button>`;
    })
    .join("");
  Edel.initIcons();
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
      item.businessPhoto || "/assets/images/business-photo-default.jpg",
    );
  }
  const modalProviderImg = document.getElementById("modal-provider-img");
  if (modalProviderImg) {
    modalProviderImg.src = EdelModules.api.buildUrl(
      item.provider.profilePhoto || "/assets/images/avatar.jpg",
    );
  }
  const modalProviderBadge = document.getElementById("modal-provider-badge");
  if (modalProviderBadge) {
    modalProviderBadge.classList.toggle("hidden", !item.provider.hasPaidAccessFee);
  }
  if (modalProviderName) modalProviderName.innerText = item.provider.fullName;
  const modalProviderRating = document.getElementById("modal-provider-rating");
  if (modalProviderRating) {
    const ratingVal = item.provider.rating !== undefined ? Math.round(Number(item.provider.rating)) : 50;
    modalProviderRating.innerHTML = `<i data-lucide="star" class="w-3 h-3 fill-brand-accent text-brand-accent"></i> ${ratingVal}%`;
  }
  if (modalJobsDone) modalJobsDone.innerText = `${item.provider.jobsCompleted || 0} Jobs done`;
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
      item.provider.availabilityStatus === "busy" ? "Provider Busy" : "Currently Away";
    modalActionBtn.disabled = true;
    modalWarning.classList.remove("hidden");
    return;
  }

  modalActionBtn.classList.add("bg-brand-navy", "text-brand-accent", "hover:bg-brand-blue");
  modalActionBtn.innerText = "Request";
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
      modalActionBtn.innerText = "Request";
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

// ─── Stale location threshold ─────────────────────────────────────────────────
// Using 15km to reduce false positives from IP-based location approximation
const STALE_LOCATION_THRESHOLD_KM = 15;

async function syncUserLocation(lat, lng, city) {
  try {
    let label = city || getSavedLocationLabel();

    // If the label is still generic, try reverse geocoding
    if (EdelModules.location.isGenericLabel(label) && lat && lng) {
      const realAddress = await EdelModules.location.reverseGeocode(lat, lng);
      if (realAddress) {
        label = realAddress;
        if (locationText) locationText.innerText = label;
      }
    }

    await EdelModules.api.put(
      "/api/location",
      { locationLabel: label, latitude: lat, longitude: lng },
      { headers: EdelModules.auth.getAuthHeaders(), silent: true },
    );

    const user = EdelModules.auth.getUser() || {};
    user.locationLabel = label;
    user.latitude = lat;
    user.longitude = lng;
    EdelModules.auth.setUser(user);
  } catch (error) {
    console.warn("Location sync skipped:", error.message);
  }
}

/**
 * Resolve the viewer's current location.
 * Flow: 
 * 1. Has saved location? -> Silent IP staleness check -> Prompt to update if far.
 * 2. No saved location? -> Master getLocation() flow (GPS → IP fallback).
 */
async function resolveViewerLocation() {
  const cachedUser = EdelModules.auth.getUser();
  const hasSavedLocation = cachedUser?.latitude != null && cachedUser?.longitude != null;

  if (hasSavedLocation) {
    if (locationText) {
      locationText.innerText = getSavedLocationLabel();
    }

    // Perform a silent staleness check using IP geolocation
    try {
      const ipLocation = await EdelModules.location.getLocationFromIP();
      if (ipLocation && ipLocation.lat && ipLocation.lng) {
        const distanceKm = EdelModules.location.calculateDistance(
          ipLocation.lat, ipLocation.lng,
          Number(cachedUser.latitude), Number(cachedUser.longitude),
        );

        const threshold = ipLocation.staleThresholdKm || STALE_LOCATION_THRESHOLD_KM;
        if (distanceKm > threshold) {
          let confirmed;
          if (typeof CoolAlert !== "undefined" && typeof CoolAlert.show === "function") {
            confirmed = await CoolAlert.show({
              icon: 'question',
              title: '🌍 New area detected',
              text: `Did you move far from your previous location? You should update your location now to get accurate feeds on your discovery page. If you didn't move, simply ignore.`,
              showConfirmButton: true,
              showCancelButton: true,
              confirmButtonText: 'Update my location',
              cancelButtonText: 'Ignore',
              confirmButtonColor: "#fbbf24",
              cancelButtonColor: "#1B3358",
              background: "#2D1157",
              color: "#ffffff",
            });
          } else {
            const res = confirm(`🌍 New area detected\n\nDid you move far from your previous location? You should update your location now to get accurate feeds on your discovery page.\n\nClick OK to update, or Cancel to ignore.`);
            confirmed = { isConfirmed: res };
          }

          if (confirmed && confirmed.isConfirmed) {
            // User chose to update their location. Trigger the master location flow.
            const newLocationResult = await EdelModules.location.getLocation();
            
            if (newLocationResult.success && newLocationResult.location) {
              const loc = newLocationResult.location;
              if (locationText) locationText.innerText = loc.city || 'your approximate area';
              await syncUserLocation(loc.lat, loc.lng, loc.city);
              return { latitude: loc.lat, longitude: loc.lng };
            }
          }
        }
      }
    } catch (e) {
      // Ignore IP lookup failure for staleness check
    }

    // Return saved location if staleness check didn't trigger, failed, or user ignored it
    return {
      latitude: Number(cachedUser.latitude),
      longitude: Number(cachedUser.longitude),
    };
  }

  // =========================================================================
  // User has NO saved location — trigger the master location flow from scratch
  // =========================================================================
  const locationResult = await EdelModules.location.getLocation();

  if (locationResult.success && locationResult.location) {
    const loc = locationResult.location;
    const lat = loc.lat;
    const lng = loc.lng;
    const city = loc.city;

    if (locationText) {
      locationText.innerText = city || 'your approximate area';
    }

    // If the location came from IP, confirm it with the user first
    if (loc.source === 'ip') {
      const confirmed = await Ui.alert(
        'question',
        'Location Approximated',
        `📍 We detected your area as: ${city || 'your approximate area'}. Is this correct?`,
        true,
        true,
      );

      if (confirmed && confirmed.isConfirmed) {
        await syncUserLocation(lat, lng, city);
      } else {
        // User rejected the IP location — treat as failure so they enter manually
        const rejectedError = new Error('IP location rejected by user');
        rejectedError.isLocationUnavailable = true;
        throw rejectedError;
      }
    } else {
      // Precise GPS location — save automatically
      await syncUserLocation(lat, lng, city);
    }

    return { latitude: lat, longitude: lng };
  }

  // Absolute failure — no location available at all
  const noLocationError = new Error('No location available');
  noLocationError.isLocationUnavailable = true;
  throw noLocationError;
}

async function loadDiscoveryFeed() {
  const user = EdelModules.auth.getUser();
  const viewerRole = getViewerRole(user);

  if (user && viewerRole === "provider" && !_settingsLoaded) {
    try {
      const response = await EdelModules.api.get(
        "/api/services/discovery?limit=1",
        {
          headers: EdelModules.auth.getAuthHeaders(),
          silent: true,
        }
      );
      _enableCategoriesViewForProviders = !!response.enableCategoriesViewForProviders;
      _settingsLoaded = true;
      state.viewMode = _enableCategoriesViewForProviders ? "categories" : "list";
    } catch (e) {
      console.warn("Could not fetch discovery settings:", e);
    }
  }

  if (state.activeTab === "provider" && state.viewMode === "categories" && _enableCategoriesViewForProviders) {
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

    const requestedRole =
      state.activeTab === "provider" && state.viewMode === "categories"
        ? "provider"
        : "customer";

    const params = new URLSearchParams({
      role: requestedRole,
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

    // Any location failure (permission denied, IP failed, no cached coords) → show location UI
    if (error.isLocationPermissionDenied || error.isLocationUnavailable) {
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
  state.viewMode = _enableCategoriesViewForProviders ? "categories" : "list";
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

window.closeModal = () => {
  modalController.close({
    hiddenPanelClasses: ["translate-y-full", "lg:translate-y-8"],
    visiblePanelClasses: ["translate-y-0"],
  });
};

modalActionBtn?.addEventListener("click", () => {
  requestSelectedService().catch(() => {});
});

notificationsBtnMobile?.addEventListener("click", openReportsModal);
notificationsBtnDesktop?.addEventListener("click", openReportsModal);
document.getElementById("close-reports-btn")?.addEventListener("click", closeReportsModal);
reportsModal?.addEventListener("click", (event) => {
  if (event.target === reportsModal) closeReportsModal();
});

// ==========================================
// Face Verification Modal & Disclaimer Logic
// ==========================================

let _faceStream = null;
let _faceDetectionInterval = null;
let _faceModelsLoaded = false;
let _faceDetected = false;
let _capturedBlob = null;
const FACE_MODELS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

async function loadFaceModels() {
  if (_faceModelsLoaded) return;
  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODELS_URL);
    _faceModelsLoaded = true;
  } catch (e) {
    console.warn('[Face Capture] Could not load face detection model:', e);
  }
}

function stopFaceCamera() {
  if (_faceDetectionInterval) {
    clearInterval(_faceDetectionInterval);
    _faceDetectionInterval = null;
  }
  if (_faceStream) {
    _faceStream.getTracks().forEach(t => t.stop());
    _faceStream = null;
  }
}

function setFaceStatus(text, type = 'neutral') {
  const el = document.getElementById('face-status-text');
  const ring = document.getElementById('face-detect-ring');
  if (!el || !ring) return;
  el.textContent = text;
  if (type === 'good') {
    el.className = 'text-center text-sm font-semibold text-green-600 mb-4';
    ring.style.boxShadow = '0 0 0 4px #16a34a';
  } else if (type === 'warn') {
    el.className = 'text-center text-sm font-semibold text-amber-500 mb-4';
    ring.style.boxShadow = '0 0 0 4px #f59e0b';
  } else if (type === 'error') {
    el.className = 'text-center text-sm font-semibold text-red-500 mb-4';
    ring.style.boxShadow = '0 0 0 0 transparent';
  } else {
    el.className = 'text-center text-sm font-semibold text-slate-500 mb-4';
    ring.style.boxShadow = '0 0 0 0 transparent';
  }
}

async function startFaceDetectionLoop(video) {
  if (!_faceModelsLoaded) {
    setFaceStatus('Face detection unavailable. You can still capture a photo.', 'warn');
    const captureBtn = document.getElementById('btn-capture-face');
    if (captureBtn) captureBtn.disabled = false;
    return;
  }

  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

  _faceDetectionInterval = setInterval(async () => {
    if (!video || video.readyState < 2) return;
    try {
      const result = await faceapi.detectSingleFace(video, options);
      const captureBtn = document.getElementById('btn-capture-face');
      if (result) {
        _faceDetected = true;
        setFaceStatus('Face detected! Ready to capture.', 'good');
        if (captureBtn) captureBtn.disabled = false;
      } else {
        _faceDetected = false;
        setFaceStatus('Position your face inside the circle.', 'warn');
        if (captureBtn) captureBtn.disabled = true;
      }
    } catch (e) {
      // Silent
    }
  }, 400);
}

async function openFaceModal() {
  _capturedBlob = null;

  // Reset Modal Elements
  const video = document.getElementById('face-capture-video');
  const snapshotCanvas = document.getElementById('face-capture-snapshot');
  const captureBtn = document.getElementById('btn-capture-face');
  const retakeBtn = document.getElementById('btn-retake-face');
  const confirmBtn = document.getElementById('btn-confirm-face');

  if (captureBtn) { captureBtn.classList.remove('hidden'); captureBtn.disabled = true; }
  if (retakeBtn) retakeBtn.classList.add('hidden');
  if (confirmBtn) confirmBtn.classList.add('hidden');
  if (snapshotCanvas) snapshotCanvas.classList.add('hidden');
  if (video) video.classList.remove('hidden');

  faceModalController.open(faceModalContent, {
    panelClass: "flex",
    hiddenPanelClasses: ["translate-y-full", "lg:translate-y-8"],
    visiblePanelClasses: ["translate-y-0"],
  });

  setFaceStatus('Starting camera...', 'neutral');
  loadFaceModels().catch(() => {});

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
      audio: false
    });
    _faceStream = stream;
    if (video) {
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
        setFaceStatus('Position your face inside the circle.', 'warn');
        loadFaceModels().then(() => startFaceDetectionLoop(video)).catch(() => {
          setFaceStatus('Detection unavailable — you can still capture.', 'warn');
          if (captureBtn) captureBtn.disabled = false;
        });
      };
    }
  } catch (err) {
    setFaceStatus('Camera access denied. Please enable camera permissions.', 'error');
    if (captureBtn) captureBtn.disabled = true;
  }
}

function closeFaceModal() {
  stopFaceCamera();
  faceModalController.close({
    hiddenPanelClasses: ["translate-y-full", "lg:translate-y-8"],
    visiblePanelClasses: ["translate-y-0"],
  });
}

// Capture selfie
document.getElementById('btn-capture-face')?.addEventListener('click', () => {
  const video = document.getElementById('face-capture-video');
  const snapshotCanvas = document.getElementById('face-capture-snapshot');
  const captureBtn = document.getElementById('btn-capture-face');
  const retakeBtn = document.getElementById('btn-retake-face');
  const confirmBtn = document.getElementById('btn-confirm-face');
  if (!video || !snapshotCanvas) return;

  snapshotCanvas.width = video.videoWidth || 240;
  snapshotCanvas.height = video.videoHeight || 240;
  const ctx = snapshotCanvas.getContext('2d');
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(video, -snapshotCanvas.width, 0, snapshotCanvas.width, snapshotCanvas.height);
  ctx.restore();

  snapshotCanvas.toBlob(blob => {
    _capturedBlob = blob;
  }, 'image/jpeg', 0.9);

  video.classList.add('hidden');
  snapshotCanvas.classList.remove('hidden');
  captureBtn.classList.add('hidden');
  retakeBtn.classList.remove('hidden');
  confirmBtn.classList.remove('hidden');

  if (_faceDetectionInterval) { clearInterval(_faceDetectionInterval); _faceDetectionInterval = null; }
  setFaceStatus('Looking good! Confirm or retake.', 'good');
  Edel.initIcons();
});

// Retake photo
document.getElementById('btn-retake-face')?.addEventListener('click', () => {
  const video = document.getElementById('face-capture-video');
  const snapshotCanvas = document.getElementById('face-capture-snapshot');
  const captureBtn = document.getElementById('btn-capture-face');
  const retakeBtn = document.getElementById('btn-retake-face');
  const confirmBtn = document.getElementById('btn-confirm-face');

  _capturedBlob = null;
  video?.classList.remove('hidden');
  snapshotCanvas?.classList.add('hidden');
  captureBtn?.classList.remove('hidden');
  if (captureBtn) captureBtn.disabled = true;
  retakeBtn?.classList.add('hidden');
  confirmBtn?.classList.add('hidden');

  setFaceStatus('Position your face inside the circle.', 'warn');
  if (video) startFaceDetectionLoop(video);
  Edel.initIcons();
});

// Confirm and Upload
document.getElementById('btn-confirm-face')?.addEventListener('click', async () => {
  const user = EdelModules.auth.getUser();
  if (!_capturedBlob || !user || !user.email) {
    Ui.toast('error', 'Capture Error', 'No photo captured. Please try again.');
    return;
  }

  const confirmBtn = document.getElementById('btn-confirm-face');
  const retakeBtn = document.getElementById('btn-retake-face');
  const originalHtml = confirmBtn.innerHTML;

  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Uploading...';
  if (retakeBtn) retakeBtn.disabled = true;
  Edel.initIcons();

  try {
    const formData = new FormData();
    formData.append('email', user.email);
    formData.append('facePhoto', _capturedBlob, 'face.jpg');

    await EdelModules.api.post('/api/auth/upload-face', formData, {
      headers: EdelModules.auth.getAuthHeaders(),
      silent: true
    });

    // Update local user data
    user.faceVerified = true;
    EdelModules.auth.setUser(user);

    Ui.toast('success', 'Face Verified', 'Your identity has been confirmed.');
    closeFaceModal();
    checkVerificationDisclaimer(); // Refresh disclaimer state
  } catch (err) {
    Ui.toast('error', 'Upload Failed', err.message || 'Could not upload face photo. Please try again.');
    confirmBtn.innerHTML = originalHtml;
    confirmBtn.disabled = false;
    if (retakeBtn) retakeBtn.disabled = false;
    Edel.initIcons();
  }
});

// Close modal handlers
closeFaceModalBtn?.addEventListener('click', closeFaceModal);
faceModal?.addEventListener('click', (event) => {
  if (event.target === faceModal) closeFaceModal();
});

function checkVerificationDisclaimer() {
  const user = EdelModules.auth.getUser();
  if (!user || user.faceVerified) {
    if (disclaimerContainer) disclaimerContainer.classList.add("hidden");
    return;
  }

  const effectiveRole = getViewerRole(user);
  let message = "";
  
  if (effectiveRole === "provider") {
    message = "Complete your digital shop setup and facial verification to unlock 3 free trial";
  } else {
    message = "Complete your KYC verification";
  }

  disclaimerContainer.innerHTML = `
    <style>
      @keyframes verifyGlow {
        0%, 100% {
          box-shadow: 0 0 15px rgba(251, 191, 36, 0.4);
        }
        50% {
          box-shadow: 0 0 25px rgba(251, 191, 36, 0.8);
        }
      }
      .btn-verify-glow {
        animation: verifyGlow 2s infinite ease-in-out;
      }
    </style>
    <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-navy via-brand-blue to-brand-navy p-5 text-white shadow-soft flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/10">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.15),transparent_45%)] pointer-events-none"></div>
      <div class="flex items-center gap-4 relative z-10">
        <div class="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
          <i data-lucide="shield-alert" class="w-6 h-6 text-brand-accent animate-pulse"></i>
        </div>
        <div>
          <h4 class="font-bold text-base md:text-lg text-white">Action Required</h4>
          <p class="text-xs md:text-sm text-slate-200 mt-1 max-w-xl">
            ${message}
          </p>
        </div>
      </div>
      <button
        id="btn-trigger-face-verification"
        class="btn-verify-glow relative z-10 shrink-0 bg-brand-accent hover:bg-brand-accentHover text-brand-navy font-extrabold px-6 py-3 rounded-2xl transition-all duration-300 active:scale-95 flex items-center gap-2 text-sm uppercase tracking-wider"
      >
        <i data-lucide="scan-face" class="w-4 h-4"></i>
        Verify
      </button>
    </div>
  `;

  disclaimerContainer.classList.remove("hidden");
  Edel.initIcons();

  document.getElementById("btn-trigger-face-verification")?.addEventListener("click", openFaceModal);
}

window.addEventListener("load", () => {
  const user = EdelModules.auth.getUser();
  const viewerRole = getViewerRole(user);

  if (user && viewerRole === "provider") {
    state.activeTab = "provider";
    state.viewMode = _enableCategoriesViewForProviders ? "categories" : "list";
  } else if (user && viewerRole === "customer") {
    state.activeTab = "customer";
    state.viewMode = "list";
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
