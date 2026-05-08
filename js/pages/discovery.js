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
const modalActionBtn = document.getElementById("modal-action-btn");
const modalWarning = document.getElementById("modal-warning");
const modalTitle = document.getElementById("modal-title");
const modalCategory = document.getElementById("modal-category");
const modalProviderName = document.getElementById("modal-provider-name");
const modalDescription = document.getElementById("modal-description");
const modalDistance = document.getElementById("modal-distance");
const modalPrice = document.getElementById("modal-price");

const modalController = EdelModules.ui.createOverlayModal({
  overlay: modal,
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
  requestController: null,
};

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

function buildCardMarkup(item) {
  const profilePhoto =
    item.provider.profilePhoto ||
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=100&q=80";

  return `
    <div
      class="bg-white rounded-3xl p-5 border border-slate-100 shadow-soft hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
      data-service-id="${item.id}"
    >
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

      <h3 class="text-lg font-bold text-brand-navy mb-2 group-hover:text-brand-blue transition-colors">
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
        You need to enable browser location access for the full Edel experience and to see nearby services around you.
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

  if (!items.length) {
    renderEmptyState(
      "Try a different search term, change category, or refresh your location.",
    );
    return;
  }

  listingsContainer.innerHTML = items.map(buildCardMarkup).join("");
  Edel.initIcons();
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

  modalController.open(modal, {
    panelClass: "flex",
    hiddenPanelClasses: ["translate-y-full", "lg:translate-y-8"],
    visiblePanelClasses: ["translate-y-0"],
  });

  modalTitle.innerText = item.title;
  modalCategory.innerText = item.category;
  if (modalProviderName) modalProviderName.innerText = item.provider.fullName;
  if (modalDescription) modalDescription.innerText = item.description;
  if (modalDistance) modalDistance.innerHTML = `<i data-lucide="map-pin" class="w-4 h-4 text-brand-accent"></i> ${formatDistance(item.distanceKm)}`;
  if (modalPrice) modalPrice.innerText = formatCurrency(item.basePrice);
  Edel.initIcons();

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
  modalActionBtn.classList.remove("bg-slate-200", "text-slate-500", "cursor-not-allowed");
  modalActionBtn.innerText = "Request Service Now";
  modalActionBtn.disabled = false;
  modalWarning.classList.add("hidden");
}

function getSavedLocationLabel() {
  return EdelModules.location.formatLocationLabel(
    EdelModules.auth.getUser()?.locationLabel,
    "Current location",
  );
}

async function syncUserLocation(position) {
  try {
    await EdelModules.api.put(
      "/api/location",
      {
        locationLabel: getSavedLocationLabel(),
        latitude: position.latitude,
        longitude: position.longitude,
      },
      {
        headers: EdelModules.auth.getAuthHeaders(),
        silent: true,
      },
    );

    const user = EdelModules.auth.getUser() || {};
    user.locationLabel = getSavedLocationLabel();
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
      maxAcceptedAccuracy: 150,
      timeout: 7000,
      maximumAge: 15000,
    });
    locationText.innerText = getSavedLocationLabel();
    await syncUserLocation(browserLocation);
    return browserLocation;
  } catch (error) {
    const cachedUser = EdelModules.auth.getUser();
    if (cachedUser?.latitude && cachedUser?.longitude) {
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
  if (state.activeTab === "provider") {
    listingsContainer.innerHTML = providerViewMarkup;
    Edel.initIcons();
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
      },
    );

    renderCategories(response.categories || []);
    renderListings(response.services || []);
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
        "Your location signal is too weak right now. Please try again in a clearer signal area for the full Edel experience.",
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
  setActiveTab("customer");
  loadDiscoveryFeed().catch(() => {});
});

tabProvider?.addEventListener("click", () => {
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
  loadDiscoveryFeed().catch(() => {});
});

listingsContainer?.addEventListener("click", (event) => {
  const card = event.target.closest("[data-service-id]");
  if (!card) return;
  openDiscoveryModal(card.dataset.serviceId);
});

modal?.addEventListener("click", (event) => {
  if (event.target !== modal) return;
  modalController.close({
    hiddenPanelClasses: ["translate-y-full", "lg:translate-y-8"],
    visiblePanelClasses: ["translate-y-0"],
  });
});

modalActionBtn?.addEventListener("click", () => {
  Ui.toast(
    "info",
    "Ordering Comes Next",
    "Discovery is live. The order request flow will be connected in the next implementation block.",
  );
});

window.closeModal = () =>
  modalController.close({
    hiddenPanelClasses: ["translate-y-full", "lg:translate-y-8"],
    visiblePanelClasses: ["translate-y-0"],
  });

window.addEventListener("load", () => {
  setActiveTab("customer");
  loadDiscoveryFeed().catch((error) => {
    Ui.toast("error", "Discovery Unavailable", error.message);
  });
});
