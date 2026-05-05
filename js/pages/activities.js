Edel.initIcons();
Edel.applySafeArea();

const viewCustomer = document.getElementById("view-customer");
const viewProviderIncoming = document.getElementById("view-provider-incoming");
const viewProviderActive = document.getElementById("view-provider-active");
const routeLine = document.getElementById("route-line");
const markerDestination = document.getElementById("marker-destination");
const movingLabel = document.getElementById("moving-label");
const movingAvatar = document.querySelector("#moving-avatar img");
const btnCustomer = document.getElementById("btn-view-customer");
const btnProvider = document.getElementById("btn-view-provider");
const overlay = document.getElementById("modal-overlay");

const activityModal = EdelModules.ui.createOverlayModal({
  overlay,
  defaultPanelClass: "flex",
});

const activeToggleClass =
  "px-4 py-2 rounded-lg bg-brand-navy text-brand-accent font-bold text-xs transition-all shadow-sm";
const inactiveToggleClass =
  "px-4 py-2 rounded-lg text-slate-500 font-bold text-xs hover:text-brand-navy transition-all";

function updateStatusBadge(text, isPulse) {
  const pulseHTML = isPulse
    ? '<span class="w-2 h-2 bg-brand-accent rounded-full animate-pulse"></span>'
    : "";
  const html = `<span class="text-white text-sm font-bold flex items-center gap-2">${pulseHTML} ${text}</span>`;
  document.getElementById("mobile-status-badge").innerHTML = html;
  document.getElementById("desktop-status-badge").innerHTML = html;
}

function setView(viewType) {
  EdelModules.ui.showOnly(
    [viewCustomer, viewProviderIncoming, viewProviderActive],
    viewType === "customer" ? viewCustomer : viewProviderIncoming,
  );

  EdelModules.ui.setClassName(
    btnCustomer,
    viewType === "customer" ? activeToggleClass : inactiveToggleClass,
  );
  EdelModules.ui.setClassName(
    btnProvider,
    viewType === "provider" ? activeToggleClass : inactiveToggleClass,
  );

  if (viewType === "customer") {
    movingLabel.innerText = "Maria is 4 mins away";
    movingAvatar.src =
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=100&q=80";
    routeLine.classList.remove("hidden");
    markerDestination.classList.remove("hidden");
    updateStatusBadge("Active Tracking", true);
    return;
  }

  movingLabel.innerText = "Waiting for Request...";
  movingAvatar.src =
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=100&q=80";
  routeLine.classList.add("hidden");
  markerDestination.classList.add("hidden");
  updateStatusBadge("Waiting for Requests", false);
}

function acceptOrder() {
  EdelModules.ui.showOnly(
    [viewCustomer, viewProviderIncoming, viewProviderActive],
    viewProviderActive,
  );
  movingLabel.innerText = "You are driving";
  routeLine.classList.remove("hidden");
  markerDestination.classList.remove("hidden");
  updateStatusBadge("Active Tracking", true);
}

function toggleForm(formId) {
  const form = document.getElementById(formId);
  const siblingForm =
    formId === "cancel-form"
      ? document.getElementById("report-form")
      : document.getElementById("cancel-form");

  EdelModules.ui.toggleHidden(siblingForm, true);
  EdelModules.ui.toggleHidden(form);
}

function submitForm(formId) {
  const isCancel = formId === "cancel-form";
  const message = isCancel
    ? "Cancellation submitted successfully."
    : "Report filed securely. An admin will review it shortly.";

  EdelModules.ui.toggleHidden(document.getElementById(formId), true);
  alert(message);
}

function openModal(modalId) {
  const panel = document.getElementById(modalId);
  activityModal.open(panel, {
    panelClass: "flex",
    hiddenPanelClasses: ["scale-95"],
    visiblePanelClasses: ["scale-100"],
  });
}

function closeModal() {
  activityModal.close({
    hiddenPanelClasses: ["scale-95"],
    visiblePanelClasses: ["scale-100"],
  });
}

function simulateScanSuccess() {
  const scanner = document.getElementById("scanner-modal");
  const success = document.getElementById("success-modal");

  activityModal.close({
    hiddenPanelClasses: ["scale-95"],
    visiblePanelClasses: ["scale-100"],
    onClose: () => {
      activityModal.open(success, {
        panelClass: "flex",
        hiddenPanelClasses: ["scale-95"],
        visiblePanelClasses: ["scale-100"],
      });
    },
  });

  scanner.classList.add("hidden");
}

overlay.addEventListener("click", (event) => {
  if (event.target !== overlay) return;
  closeModal();
});

window.setView = setView;
window.acceptOrder = acceptOrder;
window.declineOrder = () => alert("Order Declined. Waiting for next request...");
window.toggleForm = toggleForm;
window.submitForm = submitForm;
window.openModal = openModal;
window.closeModal = closeModal;
window.simulateScanSuccess = simulateScanSuccess;
