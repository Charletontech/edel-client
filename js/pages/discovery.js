Edel.initIcons();
Edel.applySafeArea();

const locationText = document.getElementById("location-text");
const locationBtn = document.getElementById("location-btn");
const tabCustomer = document.getElementById("tab-customer");
const tabProvider = document.getElementById("tab-provider");
const listingsContainer = document.getElementById("listings-container");
const modal = document.getElementById("listing-modal");
const modalContent = document.getElementById("modal-content");
const modalActionBtn = document.getElementById("modal-action-btn");
const modalWarning = document.getElementById("modal-warning");
const modalTitle = document.getElementById("modal-title");
const modalCategory = document.getElementById("modal-category");

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
    <h3 class="text-xl font-bold mb-2">Scanning for requests...</h3>
    <p class="text-slate-400 max-w-md">You are online and visible. Customers in Lagos can now send requests to you based on your registered skills.</p>
    <button class="mt-6 border border-white/20 px-6 py-2 rounded-full text-sm font-medium hover:bg-white/10 transition-colors">Update Skills</button>
  </div>
`;

function setActiveTab(activeTab) {
  EdelModules.ui.setClassName(
    tabCustomer,
    activeTab === "customer" ? customerTabClass : providerTabClass,
  );
  EdelModules.ui.setClassName(
    tabProvider,
    activeTab === "provider" ? customerTabClass : providerTabClass,
  );
}

function rerenderListings(markup) {
  listingsContainer.style.opacity = 0;
  window.setTimeout(() => {
    if (typeof markup === "string") {
      listingsContainer.innerHTML = markup;
      Edel.initIcons();
    }
    listingsContainer.style.opacity = 1;
  }, 300);
}

function openDiscoveryModal(type) {
  modalController.open(modal, {
    panelClass: "flex",
    hiddenPanelClasses: ["translate-y-full", "lg:translate-y-8"],
    visiblePanelClasses: ["translate-y-0"],
  });

  if (type === "modal-2") {
    modalTitle.innerText = "Emergency Pipe Repair";
    modalCategory.innerText = "Plumbing";
    modalActionBtn.classList.remove(
      "bg-brand-navy",
      "text-brand-accent",
      "hover:bg-brand-blue",
    );
    modalActionBtn.classList.add(
      "bg-slate-200",
      "text-slate-500",
      "cursor-not-allowed",
    );
    modalActionBtn.innerText = "Provider Busy";
    modalActionBtn.disabled = true;
    modalWarning.classList.remove("hidden");
    return;
  }

  modalTitle.innerText = "Premium Home Deep Clean";
  modalCategory.innerText = "Deep Cleaning";
  modalActionBtn.classList.add(
    "bg-brand-navy",
    "text-brand-accent",
    "hover:bg-brand-blue",
  );
  modalActionBtn.classList.remove(
    "bg-slate-200",
    "text-slate-500",
    "cursor-not-allowed",
  );
  modalActionBtn.innerText = "Request Service Now";
  modalActionBtn.disabled = false;
  modalWarning.classList.add("hidden");
}

window.addEventListener("load", () => {
  EdelModules.location.simulateLocationText(locationText);
});

locationBtn.addEventListener("click", () => {
  EdelModules.location.simulateLocationText(locationText);
});

tabCustomer.addEventListener("click", () => {
  setActiveTab("customer");
  rerenderListings();
});

tabProvider.addEventListener("click", () => {
  setActiveTab("provider");
  rerenderListings(providerViewMarkup);
});

modal.addEventListener("click", (event) => {
  if (event.target !== modal) return;
  modalController.close({
    hiddenPanelClasses: ["translate-y-full", "lg:translate-y-8"],
    visiblePanelClasses: ["translate-y-0"],
  });
});

window.openModal = (type) => openDiscoveryModal(type);
window.closeModal = () =>
  modalController.close({
    hiddenPanelClasses: ["translate-y-full", "lg:translate-y-8"],
    visiblePanelClasses: ["translate-y-0"],
  });
