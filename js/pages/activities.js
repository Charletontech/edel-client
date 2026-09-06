Edel.initIcons();
Edel.applySafeArea();

if (!EdelModules.auth.requireAuth()) {
  throw new Error("Authentication required");
}

const viewCustomer = document.getElementById("view-customer");
const viewProvider = document.getElementById("view-provider");
const btnCustomer = document.getElementById("btn-view-customer");
const btnProvider = document.getElementById("btn-view-provider");
const routeLine = document.getElementById("route-line");
const markerDestination = document.getElementById("marker-destination");
const movingLabel = document.getElementById("moving-label");
const movingAvatar = document.querySelector("#moving-avatar img");
const overlay = document.getElementById("modal-overlay");
const sidebarUserName = document.getElementById("sidebar-user-name");
const sidebarRole = document.getElementById("sidebar-role");

const activityModal = EdelModules.ui.createOverlayModal({
  overlay,
  defaultPanelClass: "flex",
});

const activeToggleClass =
  "px-4 py-2 rounded-lg bg-brand-navy text-brand-accent font-bold text-xs transition-all shadow-sm";
const inactiveToggleClass =
  "px-4 py-2 rounded-lg text-slate-500 font-bold text-xs hover:text-brand-navy transition-all";

let socket = null;
if (window.io) {
  const socketUrl = window.EdelConfig?.apiBaseUrl || "";
  socket = io(socketUrl);
  socket.on("connect", () => {
    console.log("Socket connected");
    const user = EdelModules.auth.getUser();
    if (user) {
      socket.emit("joinRoom", `user_${user.id}`);
    }
  });
  
  socket.on("orderStatusChanged", (data) => {
    console.log("Order status changed via socket", data);
    loadActivities();
  });

  socket.on("newOrderReceived", (data) => {
    console.log("New order received via socket", data);
    if (typeof coolalert !== 'undefined') {
      coolalert.alert({ type: "info", title: "New Request", text: "A new service request has arrived!" });
    }
    loadActivities();
  });

  socket.on("orderAccepted", (data) => {
    console.log("Order accepted via socket", data);
    loadActivities();
  });

  socket.on("orderDeclined", (data) => {
    console.log("Order declined via socket", data);
    if (typeof coolalert !== 'undefined') {
      coolalert.alert({ type: "error", title: "Declined", text: "The provider declined your request." });
    }
    loadActivities();
  });

  socket.on("orderCancelled", (data) => {
    console.log("Order cancelled via socket", data);
    if (typeof coolalert !== 'undefined') {
      coolalert.alert({ type: "info", title: "Cancelled", text: "The other party has cancelled the order." });
    }
    loadActivities();
  });

  socket.on("orderReported", (data) => {
    console.log("Order reported via socket", data);
    loadActivities();
  });

  socket.on("completionRequested", (data) => {
    console.log("Completion requested via socket", data);
    loadActivities();
  });

  socket.on("completionRejected", (data) => {
    console.log("Completion rejected via socket", data);
    loadActivities();
  });
}

const state = {
  user: EdelModules.auth.getUser() || {},
  activeView: "customer",
  customerOrder: null,
  providerOrder: null,
  isLoading: true,
  pollTimer: null,
};

function getSessionRole(user = state.user) {
  if (!user) return "customer";
  if (user.role === "both") {
    return EdelModules.auth.getSessionRole(user) || "customer";
  }
  return user.role || "customer";
}

function formatCurrency(amount) {
  return `₦${Number(amount || 0).toLocaleString()}`;
}

function formatDistance(distanceKm) {
  if (distanceKm === null || typeof distanceKm === "undefined") return "Nearby";
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  return `${distanceKm.toFixed(1)} km`;
}

function formatDate(dateValue) {
  if (!dateValue) return "Just now";

  return new Date(dateValue).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function estimateEta(distanceKm) {
  if (distanceKm === null || typeof distanceKm === "undefined") return null;
  if (distanceKm <= 0.5) return null;
  return Math.max(4, Math.ceil(distanceKm * 6));
}

function getUserRoleLabel(role) {
  return EdelModules.auth.getRoleLabel({ role, activeRole: getSessionRole(state.user) });
}

function populateUserProfile() {
  const sidebarImg = document.getElementById("sidebar-user-img");
  const mobileImg = document.getElementById("mobile-user-img");

  if (sidebarUserName)
    sidebarUserName.textContent = state.user.fullName || "User";
  if (sidebarRole) sidebarRole.textContent = EdelModules.auth.getRoleLabel(state.user);

  const profilePhoto = EdelModules.api.buildUrl(
    state.user.profilePhoto || "/assets/images/avatar.jpg",
  );
  if (sidebarImg) sidebarImg.src = profilePhoto;
  if (mobileImg) mobileImg.src = profilePhoto;
}

function canUseCustomerView() {
  return getSessionRole(state.user) === "customer" || state.user.role === "admin";
}

function canUseProviderView() {
  return getSessionRole(state.user) === "provider" || state.user.role === "admin";
}

function updateStatusBadge(text, isPulse = false) {
  const pulseHTML = isPulse
    ? '<span class="w-2 h-2 bg-brand-accent rounded-full animate-pulse"></span>'
    : '<span class="w-2 h-2 bg-brand-accent rounded-full"></span>';
  const html = `<span class="text-white text-sm font-bold flex items-center gap-2">${pulseHTML}${text}</span>`;
  document.getElementById("mobile-status-badge").innerHTML = html;
  document.getElementById("desktop-status-badge").innerHTML = html;
}

function renderLoading(target) {
  target.innerHTML = `
    <div class="p-6 space-y-4 animate-pulse">
      <div class="h-8 w-40 bg-slate-200 rounded-xl"></div>
      <div class="h-4 w-64 bg-slate-100 rounded"></div>
      <div class="bg-white/80 rounded-3xl border border-slate-100 p-5 space-y-4">
        <div class="h-16 bg-slate-100 rounded-2xl"></div>
        <div class="h-24 bg-slate-100 rounded-2xl"></div>
        <div class="h-12 bg-slate-100 rounded-xl"></div>
      </div>
    </div>
  `;
}

function buildEmptyState({ icon, title, message }) {
  return `
    <div class="p-6">
      <div class="bg-white rounded-[2rem] border border-slate-100 shadow-soft p-8 text-center">
        <div class="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-4">
          <i data-lucide="${icon}" class="w-8 h-8 text-brand-navy"></i>
        </div>
        <h2 class="text-2xl font-bold text-brand-navy mb-2">${title}</h2>
        <p class="text-slate-500 max-w-sm mx-auto">${message}</p>
      </div>
    </div>
  `;
}

function getPartyAvatar(order, roleKey) {
  const record = order?.[roleKey];
  return (
    record?.profilePhoto ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
  );
}

function getOrderService(order) {
  return order?.service || {};
}

function getOrderProvider(order) {
  return order?.provider || {};
}

function getOrderCustomer(order) {
  return order?.customer || {};
}

function renderCustomerOrder(order) {
  if (!canUseCustomerView()) {
    return buildEmptyState({
      icon: "user-x",
      title: "Customer view unavailable",
      message: "This account does not have customer ordering enabled.",
    });
  }

  if (!order || order.status === "completed" || order.status === "cancelled" || order.status === "declined") {
    return buildEmptyState({
      icon: "shopping-bag",
      title: "No active customer order",
      message: "You have not ordered for a service yet.",
    });
  }

  const provider = getOrderProvider(order);
  const service = getOrderService(order);
  const etaMinutes = estimateEta(provider.distanceKm);
  const pending = order.status === "pending";
  const inProgress = order.status === "in_progress";
  const completionRequested = order.status === "completion_requested";

  let headerTitle = "Provider on the way";
  let statusBadgeText = etaMinutes ? `${etaMinutes} mins` : "Nearby";
  let descriptionText = "Your provider has accepted the order and is preparing to serve you.";

  if (pending) {
    headerTitle = "Waiting for provider";
    statusBadgeText = "Pending";
    descriptionText = "Your order has been sent to the provider. We are waiting for a response.";
  } else if (inProgress) {
    headerTitle = "Service in Progress";
    statusBadgeText = "Active Job";
    descriptionText = "The provider is currently working on your request.";
  } else if (completionRequested) {
    headerTitle = "Completion Requested";
    statusBadgeText = "Action Required";
    descriptionText = "The provider has marked this job as completed. Please confirm.";
  }

  return `
    <div class="p-6 space-y-4">
      <div class="pb-2 border-b border-slate-100">
        <div class="flex justify-between items-start gap-4 mb-2">
          <h2 class="text-2xl font-bold text-brand-navy">
            ${headerTitle}
          </h2>
          <div class="bg-blue-50 text-brand-blue px-3 py-1 rounded-lg flex items-center gap-1 text-sm font-bold border border-blue-100">
            <i data-lucide="${inProgress ? 'hammer' : 'clock'}" class="w-4 h-4"></i>
            <span>${statusBadgeText}</span>
          </div>
        </div>
        <p class="text-slate-500 text-sm font-medium">
          ${descriptionText}
        </p>
        ${!inProgress ? `
        <div class="mt-3 flex items-center gap-2 text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
          <i data-lucide="navigation" class="w-4 h-4 text-brand-accent"></i>
          <span class="text-slate-500">
            Provider location:
            <strong class="text-brand-navy">${provider.locationLabel || "Location available in-app"}</strong>
          </span>
        </div>` : ''}
      </div>

      <div class="bg-slate-50 rounded-2xl p-4 flex items-center gap-4 border border-slate-100">
        <div class="relative">
          <img
            src="${getPartyAvatar(order, "provider")}"
            class="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
          />
        </div>
        <div class="flex-1">
          <h4 class="font-bold text-brand-navy text-lg leading-tight">${provider.fullName || "Provider"}</h4>
          <p class="text-sm text-slate-500">${service.category || "Service"}</p>
          <p class="text-xs text-slate-400 mt-1">${provider.phoneNumber || "Phone not available"}</p>
        </div>
      </div>

      <div class="px-1">
        <div class="flex justify-between items-center mb-1">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Service Ordered</span>
          <span class="font-bold text-brand-navy text-sm">${formatCurrency(service.basePrice)}</span>
        </div>
        <p class="font-bold text-brand-navy">${service.title || "Service request"}</p>
        <p class="text-sm text-slate-500 mt-2">${service.description || "Service details available from the provider profile."}</p>
        <p class="text-xs text-slate-400 mt-3">Ordered on ${formatDate(order.createdAt)}</p>
      </div>

      ${pending ? "" : completionRequested ? `
        <div class="bg-brand-accent/10 border border-brand-accent/20 rounded-2xl p-4 flex flex-col gap-3">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <i data-lucide="check-circle" class="text-brand-accent w-5 h-5"></i>
            </div>
            <div>
              <p class="text-sm font-bold text-brand-navy">Confirm Completion</p>
              <p class="text-xs text-slate-500">Has the provider finished the job?</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button type="button" data-confirm-completion="${order.id}" class="flex-[2] bg-brand-navy text-brand-accent hover:bg-brand-blue font-bold py-3 rounded-xl shadow-sm transition-all active:scale-95 flex justify-center items-center gap-1">
              <i data-lucide="check" class="w-4 h-4"></i> Yes, Job Done
            </button>
            <button type="button" data-reject-completion="${order.id}" class="flex-[1] bg-red-50 text-red-600 hover:bg-red-100 font-bold py-3 rounded-xl transition-all flex justify-center items-center gap-1">
              <i data-lucide="x" class="w-4 h-4"></i> No
            </button>
          </div>
        </div>
      ` : inProgress ? `
        <!-- Bypassed Token Generation: Preserved infrastructure -->
        <div class="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <i data-lucide="hammer" class="text-slate-400 w-5 h-5"></i>
            </div>
            <div>
              <p class="text-sm font-bold text-brand-navy">Service Ongoing</p>
              <p class="text-xs text-slate-500">Wait for provider to mark as completed.</p>
            </div>
          </div>
        </div>
      ` : `
        <div class="bg-brand-accent/10 border border-brand-accent/20 rounded-2xl p-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <i data-lucide="shield-check" class="text-brand-accent w-5 h-5"></i>
            </div>
            <div>
              <p class="text-sm font-bold text-brand-navy">Secure Handshake</p>
              <p class="text-xs text-slate-500">Let the provider scan to begin</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          data-open-modal="display-qr-modal"
          class="w-full bg-brand-accent text-brand-navy hover:bg-brand-accentHover font-bold text-lg py-4 rounded-xl shadow-glow transition-all active:scale-95 flex justify-center items-center gap-2"
        >
          <i data-lucide="qr-code" class="w-5 h-5"></i> Show QR Code
        </button>
      `}

      <div class="pt-4 border-t border-slate-100 space-y-3">
        ${!inProgress ? `
        <button
          type="button"
          data-toggle-form="cancel-form"
          class="w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
        >
          <i data-lucide="ban" class="w-4 h-4"></i> Cancel Order
        </button>
        <div id="cancel-form" class="hidden p-4 bg-slate-50 rounded-xl border border-slate-200">
          <label class="text-xs font-bold text-slate-600 mb-1.5 block">Cancellation Reason</label>
          <textarea
            id="cancel-reason"
            class="w-full text-sm p-3 rounded-xl border border-slate-300 mb-3 focus:ring-2 focus:ring-brand-accent outline-none no-scrollbar"
            rows="2"
            placeholder="Why are you canceling this order?"
          ></textarea>
          <button
            type="button"
            data-cancel-order="${order.id}"
            class="w-full py-2 bg-slate-800 hover:bg-black text-white rounded-lg text-sm font-bold transition-colors"
          >
            Submit Cancellation
          </button>
        </div>` : ''}

        <button
          type="button"
          data-toggle-form="report-form"
          class="w-full py-3 rounded-xl bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
        >
          <i data-lucide="triangle-alert" class="w-4 h-4"></i> Report Provider
        </button>
        <div id="report-form" class="hidden p-4 bg-red-50 rounded-xl border border-red-100">
          <label class="text-xs font-bold text-red-600 mb-1.5 block">Issue Description</label>
          <textarea
            id="report-message"
            class="w-full text-sm p-3 rounded-xl border border-red-200 mb-3 focus:ring-2 focus:ring-red-400 outline-none no-scrollbar"
            rows="2"
            placeholder="Describe the issue with this provider..."
          ></textarea>
          <button
            type="button"
            data-report-order="${order.id}"
            class="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors"
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderProviderOrder(order) {
  if (!canUseProviderView()) {
    return buildEmptyState({
      icon: "briefcase-business",
      title: "Provider view unavailable",
      message: "This account does not have provider service features enabled.",
    });
  }

  if (!order || order.status === "completed" || order.status === "cancelled" || order.status === "declined") {
    return buildEmptyState({
      icon: "briefcase-business",
      title: "No provider order yet",
      message: "You do not have any order for your service yet.",
    });
  }

  const customer = getOrderCustomer(order);
  const service = getOrderService(order);
  const customerLocationLabel =
    customer.locationLabel || order.customerLocationLabel || "Customer location shared in-app";
  const pending = order.status === "pending";
  const inProgress = order.status === "in_progress";
  const completionRequested = order.status === "completion_requested";

  let headerTitle = "Heading to customer";
  let statusBadgeText = "Accepted";
  let descriptionText = "This order is active. Head to the customer's location and start the service when you arrive.";

  if (pending) {
    headerTitle = "New service request";
    statusBadgeText = "Pending";
    descriptionText = "A customer has requested your service. Respond now to continue.";
  } else if (inProgress) {
    headerTitle = "Service in Progress";
    statusBadgeText = "Active Job";
    descriptionText = "You are currently rendering this service. Mark as complete when done.";
  } else if (completionRequested) {
    headerTitle = "Awaiting Confirmation";
    statusBadgeText = "Action Required";
    descriptionText = "You marked the job as done. Waiting for the customer to confirm.";
  }

  return `
    <div class="p-6 space-y-4">
      <div class="pb-2 border-b border-slate-100">
        <div class="flex justify-between items-start gap-4 mb-2">
          <h2 class="text-2xl font-bold text-brand-navy">
            ${headerTitle}
          </h2>
          <div class="bg-blue-50 text-brand-blue px-3 py-1 rounded-lg flex items-center gap-1 text-sm font-bold border border-blue-100">
            <i data-lucide="${inProgress ? 'hammer' : 'clock'}" class="w-4 h-4"></i>
            <span>${statusBadgeText}</span>
          </div>
        </div>
        <p class="text-slate-500 text-sm font-medium">
          ${descriptionText}
        </p>
      </div>

      <div class="bg-slate-50 rounded-2xl p-4 flex items-center gap-4 border border-slate-100">
        <div class="relative shrink-0">
          <img
            src="${getPartyAvatar(order, "customer")}"
            class="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
          />
          ${customer.faceVerified ? `
          <div class="absolute -bottom-1 -right-1 w-5 h-5 bg-sky-500 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm" title="Verified Rookie Customer">
            <i data-lucide="check" class="w-3 h-3 text-white stroke-[3]"></i>
          </div>
          ` : ''}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h4 class="font-bold text-brand-navy text-lg leading-tight">${customer.fullName || "Customer"}</h4>
            ${customer.faceVerified ? `
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 text-sky-800 border border-sky-300/60 shadow-2xs" title="KYC Face Verified">
              <i data-lucide="shield-check" class="w-3 h-3 text-sky-600"></i> Rookie Verified
            </span>
            ` : ''}
          </div>
          <p class="text-sm text-slate-500 mt-0.5">${customer.phoneNumber || "Phone not available"}</p>
          ${!inProgress ? `<p class="text-xs text-slate-400 mt-1">${customerLocationLabel}</p>` : ''}
        </div>
      </div>

      <div class="bg-white/80 rounded-2xl border border-slate-100 p-4 space-y-3 text-sm">
        <div class="flex justify-between">
          <span class="text-slate-500">Service</span>
          <span class="font-bold text-brand-navy text-right">${service.title || "Service request"}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-500">Category</span>
          <span class="font-bold text-brand-navy">${service.category || "General"}</span>
        </div>
        ${!inProgress ? `
        <div class="flex justify-between">
          <span class="text-slate-500">Customer location</span>
          <span class="font-bold text-brand-navy text-right w-1/2">${customerLocationLabel}</span>
        </div>` : ''}
        <div class="flex justify-between">
          <span class="text-slate-500">Time requested</span>
          <span class="font-bold text-brand-navy text-right">${formatDate(order.createdAt)}</span>
        </div>
        <div class="flex justify-between pt-3 border-t border-slate-200">
          <span class="text-slate-500">Price</span>
          <span class="font-extrabold text-brand-accent text-lg">${formatCurrency(service.basePrice)}</span>
        </div>
      </div>

      ${
        pending
          ? `
        <p class="text-xs text-center text-slate-400 flex items-center justify-center gap-1">
          <i data-lucide="info" class="w-3 h-3"></i> You can only handle one active order at a time.
        </p>
        <div class="flex gap-3">
          <button
            type="button"
            data-decline-order="${order.id}"
            class="flex-1 py-4 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
          >
            Decline
          </button>
          <button
            type="button"
            data-accept-order="${order.id}"
            class="flex-[2] py-4 rounded-xl bg-brand-navy text-brand-accent font-bold hover:bg-brand-blue shadow-lg transition-transform active:scale-95"
          >
            Accept Order
          </button>
        </div>
      `
          : completionRequested
          ? `
        <div class="bg-brand-navy/5 border border-brand-navy/10 rounded-2xl p-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <i data-lucide="clock" class="text-brand-navy w-5 h-5"></i>
            </div>
            <div>
              <p class="text-sm font-bold text-brand-navy">Confirming</p>
              <p class="text-xs text-slate-500">Awaiting customer approval.</p>
            </div>
          </div>
        </div>
          `
          : inProgress 
          ? `
        <!-- Bypassed Token Generation: Preserved infrastructure -->
        <button
          type="button"
          data-request-completion="${order.id}"
          class="w-full bg-brand-navy text-brand-accent hover:bg-brand-blue font-bold text-lg py-4 rounded-xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2"
        >
          <i data-lucide="check-square" class="w-5 h-5"></i> Mark as Completed
        </button>
          ` 
          : `
        <div class="bg-brand-navy/5 border border-brand-navy/10 rounded-2xl p-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <i data-lucide="scan-line" class="text-brand-navy w-5 h-5"></i>
            </div>
            <div>
              <p class="text-sm font-bold text-brand-navy">Verify & Start</p>
              <p class="text-xs text-slate-500">Scan customer's QR code on arrival</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          data-open-modal="scanner-modal"
          class="w-full bg-brand-navy text-brand-accent hover:bg-brand-blue font-bold text-lg py-4 rounded-xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2"
        >
          <i data-lucide="qr-code" class="w-5 h-5"></i> Scan QR to Start
        </button>
      `
      }
    </div>
  `;
}

function syncMapAndStatus() {
  const activeOrder =
    state.activeView === "provider" ? state.providerOrder : state.customerOrder;

  if (!activeOrder) {
    movingLabel.innerText =
      state.activeView === "provider" ? "Waiting for customer order" : "Waiting for provider";
    movingAvatar.src =
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80";
    routeLine.classList.add("hidden");
    markerDestination.classList.add("hidden");
    updateStatusBadge("Activity Center", false);
    return;
  }

  const isPending = activeOrder.status === "pending";
  const isInProgress = activeOrder.status === "in_progress";

  if (state.activeView === "customer") {
    movingLabel.innerText =
      isPending
        ? "Awaiting provider response"
        : isInProgress ? "Service in Progress" : `${activeOrder.provider.fullName} is on the way`;
    movingAvatar.src = getPartyAvatar(activeOrder, "provider");
    routeLine.classList.toggle("hidden", isPending);
    markerDestination.classList.toggle("hidden", isPending);
    updateStatusBadge(
      isPending ? "Awaiting Response" : isInProgress ? "Job Active" : "Active Tracking",
      !isPending,
    );
    return;
  }

  movingLabel.innerText =
    isPending
      ? "New customer request"
      : isInProgress ? "Service in Progress" : "You are heading to the customer";
  movingAvatar.src = getPartyAvatar(activeOrder, "customer");
  routeLine.classList.toggle("hidden", isPending);
  markerDestination.classList.toggle("hidden", isPending);
  updateStatusBadge(
    isPending ? "New Request" : isInProgress ? "Job Active" : "Active Tracking",
    !isPending,
  );
}

function renderView() {
  EdelModules.ui.showOnly(
    [viewCustomer, viewProvider],
    state.activeView === "provider" ? viewProvider : viewCustomer,
  );

  EdelModules.ui.setClassName(
    btnCustomer,
    state.activeView === "customer" ? activeToggleClass : inactiveToggleClass,
  );
  EdelModules.ui.setClassName(
    btnProvider,
    state.activeView === "provider" ? activeToggleClass : inactiveToggleClass,
  );

  if (state.isLoading) {
    renderLoading(viewCustomer);
    renderLoading(viewProvider);
    return;
  }

  viewCustomer.innerHTML = renderCustomerOrder(state.customerOrder);
  viewProvider.innerHTML = renderProviderOrder(state.providerOrder);
  Edel.initIcons();
  syncMapAndStatus();
}

function chooseInitialView() {
  if (canUseCustomerView() && !canUseProviderView()) {
    state.activeView = "customer";
    return;
  }

  if (!canUseCustomerView() && canUseProviderView()) {
    state.activeView = "provider";
    return;
  }

  if (state.customerOrder && !state.providerOrder) {
    state.activeView = "customer";
    return;
  }

  if (!state.customerOrder && state.providerOrder) {
    state.activeView = "provider";
  }
}

async function loadActivities() {
  const previousCustomerStatus = state.customerOrder?.status;
  const previousProviderStatus = state.providerOrder?.status;
  state.isLoading = true;
  renderView();

  try {
    const response = await EdelModules.api.get("/api/orders/activity", {
      headers: EdelModules.auth.getAuthHeaders(),
      silent: true,
    });

    state.customerOrder = response.customerOrder || null;
    state.providerOrder = response.providerOrder || null;
    state.isLoading = false;
    chooseInitialView();
    renderView();

    // Auto-close context modals when the order status advances via WebSocket
    if (state.customerOrder?.status === "in_progress" && previousCustomerStatus !== "in_progress") {
      closeModal();
      Ui.toast("success", "Handshake Verified! 🎉", "Provider scanned your QR code. Service is now in progress.");
    }
    
    if (state.customerOrder?.status === "completed" && previousCustomerStatus !== "completed") {
      closeModal();
      Ui.toast("success", "Service Completed! ✅", "Your provider has successfully completed the job.");
    }

    if (state.providerOrder?.status === "completed" && previousProviderStatus !== "completed") {
      closeModal();
    }

    // Join WebSocket rooms for real-time updates
    if (socket) {
      if (state.customerOrder) {
        socket.emit("joinRoom", `order_${state.customerOrder.id}`);
      }
      if (state.providerOrder) {
        socket.emit("joinRoom", `order_${state.providerOrder.id}`);
      }
    }
  } catch (error) {
    state.isLoading = false;
    viewCustomer.innerHTML = buildEmptyState({
      icon: "triangle-alert",
      title: "Could not load activities",
      message: error.message || "Please try again in a moment.",
    });
    viewProvider.innerHTML = viewCustomer.innerHTML;
    Edel.initIcons();
  }
}

async function acceptOrder(orderId) {
  await EdelModules.api.post(
    `/api/orders/${orderId}/accept`,
    {},
    {
      headers: EdelModules.auth.getAuthHeaders(),
      silent: true,
    },
  );
  Ui.toast("success", "Order Accepted", "The customer has been notified.");
  await loadActivities();
}

async function declineOrder(orderId) {
  await EdelModules.api.post(
    `/api/orders/${orderId}/decline`,
    {},
    {
      headers: EdelModules.auth.getAuthHeaders(),
      silent: true,
    },
  );
  Ui.toast("success", "Order Declined", "You are ready for the next request.");
  await loadActivities();
}

async function cancelOrder(orderId) {
  const reason = document.getElementById("cancel-reason")?.value.trim();

  if (!reason) {
    Ui.toast("warning", "Reason Required", "Please enter a cancellation reason.");
    return;
  }

  await EdelModules.api.post(
    `/api/orders/${orderId}/cancel`,
    { reason },
    {
      headers: EdelModules.auth.getAuthHeaders(),
      silent: true,
    },
  );
  Ui.toast("success", "Order Cancelled", "Your order has been cancelled.");
  await loadActivities();
}

async function reportOrder(orderId) {
  const message = document.getElementById("report-message")?.value.trim();

  if (!message) {
    Ui.toast("warning", "Message Required", "Please describe the issue first.");
    return;
  }

  await EdelModules.api.post(
    `/api/orders/${orderId}/report`,
    { message },
    {
      headers: EdelModules.auth.getAuthHeaders(),
      silent: true,
    },
  );
  Ui.toast("success", "Report Submitted", "An admin will review your report.");
  await loadActivities();
}

async function requestCompletion(orderId) {
  try {
    await EdelModules.api.post(
      `/api/orders/${orderId}/request-completion`,
      {},
      { headers: EdelModules.auth.getAuthHeaders(), silent: true }
    );
    Ui.toast("success", "Completion Requested", "Waiting for customer to confirm.");
    await loadActivities();
  } catch (error) {
    Ui.toast("error", "Request Failed", error.message);
  }
}

async function confirmCompletion(orderId) {
  try {
    await EdelModules.api.post(
      `/api/orders/${orderId}/confirm-completion`,
      {},
      { headers: EdelModules.auth.getAuthHeaders(), silent: true }
    );
    Ui.toast("success", "Service Completed", "The job has been marked as complete.");
    await loadActivities();
  } catch (error) {
    Ui.toast("error", "Confirmation Failed", error.message);
  }
}

async function rejectCompletion(orderId) {
  try {
    await EdelModules.api.post(
      `/api/orders/${orderId}/reject-completion`,
      {},
      { headers: EdelModules.auth.getAuthHeaders(), silent: true }
    );
    Ui.toast("info", "Completion Rejected", "The order is back in progress.");
    await loadActivities();
  } catch (error) {
    Ui.toast("error", "Rejection Failed", error.message);
  }
}

function openModal(modalId) {
  const panel = document.getElementById(modalId);
  if (!panel) return;

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

sidebarUserName.textContent = state.user.fullName || "E-del User";
sidebarRole.textContent = EdelModules.auth.getRoleLabel(state.user);

const viewToggle = document.getElementById("view-toggle");
if (viewToggle && state.user.role !== "admin") {
  viewToggle.classList.add("hidden");
}

btnCustomer?.addEventListener("click", () => {
  state.activeView = "customer";
  renderView();
});

btnProvider?.addEventListener("click", () => {
  state.activeView = "provider";
  renderView();
});

document.addEventListener("click", (event) => {
  const toggleButton = event.target.closest("[data-toggle-form]");
  if (toggleButton) {
    const formId = toggleButton.dataset.toggleForm;
    const form = document.getElementById(formId);
    if (form) {
      form.classList.toggle("hidden");
    }
    return;
  }

  const modalButton = event.target.closest("[data-open-modal]");
  if (modalButton) {
    openModal(modalButton.dataset.openModal);
    return;
  }

  if (event.target.closest("[data-close-modal]")) {
    closeModal();
    return;
  }

  const acceptButton = event.target.closest("[data-accept-order]");
  if (acceptButton) {
    acceptOrder(acceptButton.dataset.acceptOrder).catch((error) => {
      Ui.toast("error", "Accept Failed", error.message);
    });
    return;
  }

  const declineButton = event.target.closest("[data-decline-order]");
  if (declineButton) {
    declineOrder(declineButton.dataset.declineOrder).catch((error) => {
      Ui.toast("error", "Decline Failed", error.message);
    });
    return;
  }

  const cancelButton = event.target.closest("[data-cancel-order]");
  if (cancelButton) {
    cancelOrder(cancelButton.dataset.cancelOrder).catch((error) => {
      Ui.toast("error", "Cancellation Failed", error.message);
    });
    return;
  }

  const reportButton = event.target.closest("[data-report-order]");
  if (reportButton) {
    reportOrder(reportButton.dataset.reportOrder).catch((error) => {
      Ui.toast("error", "Report Failed", error.message);
    });
  }

  const requestCompletionBtn = event.target.closest("[data-request-completion]");
  if (requestCompletionBtn) {
    requestCompletion(requestCompletionBtn.dataset.requestCompletion);
    return;
  }

  const confirmCompletionBtn = event.target.closest("[data-confirm-completion]");
  if (confirmCompletionBtn) {
    confirmCompletion(confirmCompletionBtn.dataset.confirmCompletion);
    return;
  }

  const rejectCompletionBtn = event.target.closest("[data-reject-completion]");
  if (rejectCompletionBtn) {
    rejectCompletion(rejectCompletionBtn.dataset.rejectCompletion);
    return;
  }

  const submitStartTokenBtn = event.target.closest("#btn-submit-start-token");
  if (submitStartTokenBtn) {
    const tokenInput = document.getElementById("input-start-token");
    verifyStartToken(tokenInput.value.trim());
    return;
  }
});

// QR Code Flow state
let qrCodeInstance = null;
let qrTimer = null;
let html5QrcodeScanner = null;
const QR_SESSION_TIME = 180; // 3 minutes

async function startQrSession() {
  const container = document.getElementById("qrcode-container");
  const countdownEl = document.getElementById("qr-countdown");
  const btnRegen = document.getElementById("btn-regenerate-qr");
  
  if (!state.customerOrder) return;

  container.innerHTML = '<div class="animate-pulse w-32 h-32 bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400">Loading...</div>';
  countdownEl.textContent = "Requesting secure session...";
  btnRegen.classList.add("hidden");
  
  const tokenDisplay = document.getElementById("start-token-value");
  if (tokenDisplay) {
    tokenDisplay.textContent = "------";
    tokenDisplay.classList.add("animate-pulse");
  }

  try {
    const position = await EdelModules.location.getBrowserLocation();
    const payload = {
      orderId: state.customerOrder.id,
      lat: position.latitude,
      lng: position.longitude,
      accuracy: position.accuracy
    };

    const res = await EdelModules.api.post("/api/orders/start-session", payload, {
      headers: EdelModules.auth.getAuthHeaders(),
      silent: true,
    });

    container.innerHTML = "";
    qrCodeInstance = new QRCode(container, {
      text: JSON.stringify({ sessionId: res.sessionId, token: res.token }),
      width: 200,
      height: 200,
      colorDark: "#0B192C", // brand-navy
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
    
    const tokenDisplay = document.getElementById("start-token-value");
    if (tokenDisplay) {
      tokenDisplay.textContent = res.token;
      tokenDisplay.classList.remove("animate-pulse");
    }

    let timeLeft = Math.floor((new Date(res.expiresAt).getTime() - Date.now()) / 1000);
    if (timeLeft <= 0) timeLeft = QR_SESSION_TIME;

    clearInterval(qrTimer);
    qrTimer = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(qrTimer);
        countdownEl.textContent = "QR Code Expired";
        countdownEl.classList.add("text-red-500");
        container.classList.add("opacity-20");
        btnRegen.classList.remove("hidden");
      } else {
        const m = Math.floor(timeLeft / 60);
        const s = (timeLeft % 60).toString().padStart(2, '0');
        countdownEl.textContent = `Expires in ${m}:${s}`;
        countdownEl.classList.remove("text-red-500");
      }
    }, 1000);

  } catch (error) {
    container.innerHTML = '<div class="w-32 h-32 bg-red-50 rounded-xl flex items-center justify-center text-xs text-red-500 text-center p-2">Failed to load</div>';
    countdownEl.textContent = error.message;
    btnRegen.classList.remove("hidden");
  }
}

document.getElementById("btn-regenerate-qr")?.addEventListener("click", () => {
  document.getElementById("qrcode-container").classList.remove("opacity-20");
  startQrSession();
});

// Pre-fetched Provider Location — persistent watcher that stays alive while scanner is open
let prefetchedPosition = null;
let prefetchingPromise = null;
let locationWatchId = null;

function prefetchProviderLocation() {
  prefetchedPosition = null;

  // Clear any existing watcher
  if (locationWatchId !== null) {
    navigator.geolocation.clearWatch(locationWatchId);
    locationWatchId = null;
  }

  if (!navigator.geolocation) return;

  // Start a persistent watcher that continuously updates position
  locationWatchId = navigator.geolocation.watchPosition(
    (position) => {
      prefetchedPosition = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
    },
    () => {
      // Silently ignore errors — the watcher keeps trying automatically
    },
    {
      enableHighAccuracy: false,
      maximumAge: 300000, // Accept cached positions up to 5 minutes old
    },
  );

  // Also fire a one-shot promise for code that awaits it
  prefetchingPromise = EdelModules.location.getBrowserLocation({ timeout: 20000 })
    .then((pos) => {
      prefetchedPosition = pos;
      return pos;
    })
    .catch(() => null);
}

function stopLocationWatch() {
  if (locationWatchId !== null) {
    navigator.geolocation.clearWatch(locationWatchId);
    locationWatchId = null;
  }
}

async function verifyStartToken(token) {
  if (!token || token.length !== 6) {
    Ui.toast("warning", "Invalid Token", "Please enter a valid 6-digit token.");
    return;
  }

  const btn = document.getElementById("btn-submit-start-token");
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Verifying...';
  btn.disabled = true;

  try {
    let position = prefetchedPosition;
    if (!position && prefetchingPromise) {
      position = await prefetchingPromise;
    }
    if (!position) {
      try {
        position = await EdelModules.location.getBrowserLocation({ timeout: 15000 });
      } catch (gpsErr) {
        throw new Error("📍 Location required to start service. Please enable GPS.");
      }
    }

    if (position.accuracy > EdelModules.location.minAcceptedAccuracy) {
      throw new Error(`📍 GPS accuracy is too poor (${Math.round(position.accuracy)}m). Try stepping outside.`);
    }

    const verifyPayload = {
      orderId: state.providerOrder.id,
      token: token,
      provider_lat: position.latitude,
      provider_lng: position.longitude,
      provider_accuracy: position.accuracy
    };

    await EdelModules.api.post("/api/orders/verify-session", verifyPayload, {
      headers: EdelModules.auth.getAuthHeaders(),
      silent: true,
    });

    closeModal();
    Ui.toast("success", "Service Started", "Token verified. Job is now in progress.");
    await loadActivities();
    
    if (html5QrcodeScanner) {
      html5QrcodeScanner.clear();
      html5QrcodeScanner = null;
    }

  } catch (error) {
    Ui.toast("error", "Verification Failed", error.message);
  } finally {
    btn.innerHTML = originalHtml;
    btn.disabled = false;
    lucide.createIcons();
  }
}

async function verifyQrSession(decodedText) {
  if (html5QrcodeScanner) {
    html5QrcodeScanner.pause(true);
  }
  
  const statusEl = document.getElementById("scanner-status");
  const btnRetry = document.getElementById("btn-retry-scan");
  statusEl.textContent = "Verifying location and proximity...";
  statusEl.className = "text-brand-accent text-center text-sm mb-4 font-bold animate-pulse";
  btnRetry.classList.add("hidden");

  try {
    let payload;
    try {
      payload = JSON.parse(decodedText);
    } catch(e) {
      throw new Error("Invalid QR Code format. Please scan a valid E-del Handshake QR.");
    }

    if (!payload.sessionId || !payload.token) {
      throw new Error("Invalid Handshake QR.");
    }

    // Use pre-fetched position if already locked, or wait for the in-flight pre-fetch promise.
    // If both are unavailable, fall back to acquiring position now.
    let position = prefetchedPosition;
    if (!position && prefetchingPromise) {
      position = await prefetchingPromise;
    }
    if (!position) {
      try {
        position = await EdelModules.location.getBrowserLocation({ timeout: 15000 });
      } catch (gpsErr) {
        if (gpsErr?.code === 1) {
          throw new Error("📍 Location access was denied. Please enable GPS in your browser settings and tap Retry.");
        } else if (gpsErr?.code === 3) {
          throw new Error("📍 Could not get your GPS in time. Step outside or away from heavy walls, then tap Retry.");
        } else {
          throw new Error("📍 GPS unavailable. Check your location settings and tap Retry.");
        }
      }
    }

    if (position.accuracy > EdelModules.location.minAcceptedAccuracy) {
      throw new Error(`📍 GPS accuracy is too poor (${Math.round(position.accuracy)}m). Try stepping outside or away from roofing and tap Retry.`);
    }

    const verifyPayload = {
      sessionId: payload.sessionId,
      token: payload.token,
      provider_lat: position.latitude,
      provider_lng: position.longitude,
      provider_accuracy: position.accuracy
    };

    await EdelModules.api.post("/api/orders/verify-session", verifyPayload, {
      headers: EdelModules.auth.getAuthHeaders(),
      silent: true,
    });

    statusEl.textContent = "Verification Successful! Service Started.";
    statusEl.className = "text-green-500 text-center text-sm mb-4 font-bold";
    if (html5QrcodeScanner) {
      html5QrcodeScanner.stop().catch(()=>{});
    }
    Ui.toast("success", "Service Started", "You have successfully verified proximity.");
    setTimeout(() => {
      closeModal();
      loadActivities();
    }, 2000);

  } catch (error) {
    statusEl.className = "text-red-400 text-center text-xs mb-4 font-bold";

    if (error.message.toLowerCase().includes("close enough")) {
      // Proximity failure — provider not near customer
      statusEl.innerHTML = `${error.message}<br><span class="text-[10px] text-slate-400 font-normal mt-1 block">GPS works best outdoors. Move closer to the customer and retry.</span>`;
    } else if (error.message.toLowerCase().includes("expired")) {
      // QR code genuinely expired
      statusEl.innerHTML = `⏱️ QR Code has expired.<br><span class="text-[10px] text-slate-400 font-normal mt-1 block">Ask the customer to generate a new QR code.</span>`;
    } else if (error.message.startsWith("📍")) {
      // GPS-specific error (permission denied, timeout, unavailable)
      statusEl.textContent = error.message;
    } else {
      // Generic / server error
      statusEl.textContent = error.message;
    }

    btnRetry.classList.remove("hidden");
  }
}

document.getElementById("btn-retry-scan")?.addEventListener("click", () => {
  const statusEl = document.getElementById("scanner-status");
  const btnRetry = document.getElementById("btn-retry-scan");
  statusEl.textContent = "Align the customer's QR code within the frame.";
  statusEl.className = "text-slate-400 text-center text-sm mb-4";
  btnRetry.classList.add("hidden");
  
  // Refresh location on retry click
  prefetchProviderLocation();

  if (html5QrcodeScanner) {
    html5QrcodeScanner.resume();
  }
});

function initQrScanner() {
  if (html5QrcodeScanner) return;
  html5QrcodeScanner = new Html5Qrcode("qr-reader");
  html5QrcodeScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 200, height: 200 } },
    (decodedText) => {
      verifyQrSession(decodedText);
    },
    (errorMessage) => {
      // Ignore background scan errors
    }
  ).catch((err) => {
    document.getElementById("scanner-status").textContent = "Camera access denied or unavailable.";
  });
}

const originalOpenModal = openModal;
openModal = function(modalId) {
  originalOpenModal(modalId);
  if (modalId === "display-qr-modal") {
    startQrSession();
  } else if (modalId === "scanner-modal") {
    prefetchProviderLocation();
    initQrScanner();
  } else if (modalId === "generate-token-modal") {
    const btn = document.getElementById("btn-confirm-generate");
    const displayArea = document.getElementById("token-display-area");
    const actionArea = document.getElementById("token-action-area");
    const tokenValue = document.getElementById("completion-token-value");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Yes, Generate";
    }
    if (displayArea && actionArea && tokenValue) {
      displayArea.classList.add("hidden");
      displayArea.classList.remove("flex");
      actionArea.classList.remove("hidden");
      tokenValue.textContent = "------";
    }
  }
}

const originalCloseModal = closeModal;
closeModal = function() {
  originalCloseModal();
  clearInterval(qrTimer);
  stopLocationWatch();
  if (html5QrcodeScanner) {
    html5QrcodeScanner.stop().then(() => {
      html5QrcodeScanner = null;
    }).catch(()=>{});
  }
}

overlay?.addEventListener("click", (event) => {
  if (event.target !== overlay) return;
  closeModal();
});

window.closeModal = closeModal;

document.getElementById("btn-confirm-generate")?.addEventListener("click", async () => {
  const btn = document.getElementById("btn-confirm-generate");
  const displayArea = document.getElementById("token-display-area");
  const actionArea = document.getElementById("token-action-area");
  const tokenValue = document.getElementById("completion-token-value");
  
  if (!state.customerOrder) return;
  
  btn.disabled = true;
  btn.textContent = "Generating...";
  
  try {
    const response = await EdelModules.api.post(`/api/orders/${state.customerOrder.id}/generate-token`, {}, {
      headers: EdelModules.auth.getAuthHeaders(),
      silent: true,
    });
    
    tokenValue.textContent = response.token;
    actionArea.classList.add("hidden");
    displayArea.classList.remove("hidden");
    displayArea.classList.add("flex");
    
    Ui.toast("success", "Token Generated", "Give this token to your provider.");
  } catch (error) {
    btn.disabled = false;
    btn.textContent = "Yes, Generate";
    Ui.toast("error", "Failed to generate", error.message);
  }
});

let isSubmittingCompletion = false;
document.getElementById("btn-submit-completion")?.addEventListener("click", async () => {
  if (isSubmittingCompletion) return;

  const btn = document.getElementById("btn-submit-completion");
  const tokenInput = document.getElementById("input-completion-token");
  
  if (!state.providerOrder) return;
  
  const token = tokenInput?.value?.trim();
  if (!token || token.length < 6) {
    Ui.toast("warning", "Invalid Token", "Please enter the 6-digit token.");
    return;
  }
  
  isSubmittingCompletion = true;
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Verifying...";
  }
  
  try {
    await EdelModules.api.post(`/api/orders/${state.providerOrder.id}/complete`, { token }, {
      headers: EdelModules.auth.getAuthHeaders(),
      silent: true,
    });
    
    Ui.toast("success", "Service Completed", "The job has been marked as complete.");
    closeModal();
    if (tokenInput) tokenInput.value = "";
    await loadActivities();
  } catch (error) {
    // If order was already completed, ignore error and update UI cleanly
    if (error.message && error.message.includes("completed")) {
      closeModal();
      await loadActivities();
      return;
    }
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Verify & Complete";
    }
    if (tokenInput) tokenInput.value = "";
    Ui.toast("error", "Verification Failed", error.message);
  } finally {
    isSubmittingCompletion = false;
  }
});

populateUserProfile();
loadActivities().catch((error) => {
  Ui.toast("error", "Activities Unavailable", error.message);
});
