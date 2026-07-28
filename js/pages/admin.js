Edel.initIcons();

if (!EdelModules.auth.requireAuth()) {
  throw new Error("Authentication required");
}

const Admin = (() => {
  const state = {
    currentModule: "dashboard",
    dashboard: null,
    users: [],
    orders: [],
    reports: [],
    settings: [],
    emailComposer: {
      to: "",
      subject: "",
      message: "",
    },
    emailSendFeedback: null,
    currentUserDetail: null,
    currentOrderDetail: null,
    currentReportDetail: null,
    filters: {
      dashboard: { search: "" },
      users: { search: "", role: "", accountStatus: "" },
      orders: { search: "", status: "", reportedOnly: false },
      reports: { search: "", status: "open" },
      settings: { search: "" },
      emails: { search: "" },
    },
    loading: false,
  };

  const els = {
    moduleContainer: document.getElementById("module-container"),
    modalContainer: document.getElementById("modal-container"),
    globalSearch: document.getElementById("global-search"),
    logoutButton: document.getElementById("logout-button"),
    adminName: document.getElementById("admin-name"),
    adminEmail: document.getElementById("admin-email"),
    adminAvatar: document.getElementById("admin-avatar"),
    topbarAdminName: document.getElementById("topbar-admin-name"),
    sidebar: document.getElementById("sidebar"),
    sidebarToggle: document.getElementById("sidebar-toggle"),
    sidebarOverlay: document.getElementById("sidebar-overlay"),
  };

  const ADMIN_REPORT_ACTIONS = [
    { value: "no_action", label: "No Action" },
    { value: "warning_issued", label: "Warn Provider" },
    { value: "provider_suspended", label: "Suspend Provider" },
    { value: "customer_suspended", label: "Suspend Customer" },
    { value: "service_disabled", label: "Disable Service" },
  ];

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function formatCurrency(amount) {
    return `₦${Number(amount || 0).toLocaleString()}`;
  }

  function formatDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function capitalize(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function getStatusClass(status) {
    switch (status) {
      case "completed":
      case "resolved":
      case "active":
      case "available":
        return "bg-green-100 text-green-700";
      case "in_progress":
      case "reviewed":
      case "admin":
        return "bg-blue-100 text-blue-700";
      case "pending":
      case "open":
        return "bg-amber-100 text-amber-700";
      case "cancelled":
      case "disabled":
      case "unavailable":
      case "away":
        return "bg-slate-100 text-slate-700";
      case "declined":
      case "suspended":
        return "bg-red-100 text-red-700";
      case "busy":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  function buildAvatar(name, photo, sizeClass = "w-10 h-10") {
    if (photo) {
      const fullUrl = EdelModules.api.buildUrl(photo);
      return `<img src="${fullUrl}" alt="${escapeHtml(name)}" class="${sizeClass} rounded-full object-cover border border-slate-200 cursor-pointer hover:scale-105 hover:border-brand-navy transition-all duration-200" onclick="Admin.previewImage('${fullUrl}', '${escapeHtml(name)} Profile Photo')" />`;
    }

    return `
      <div class="${sizeClass} rounded-full bg-slate-100 flex items-center justify-center text-brand-navy font-bold text-xs border border-slate-200 select-none">
        ${escapeHtml((name || "U").charAt(0).toUpperCase())}
      </div>
    `;
  }

  function renderBadge(text, status) {
    return `<span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusClass(status)}">${escapeHtml(text)}</span>`;
  }

  function renderLoading() {
    els.moduleContainer.innerHTML = `
      <div class="flex items-center justify-center py-24">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-navy"></div>
      </div>
    `;
  }

  function renderErrorState(message) {
    els.moduleContainer.innerHTML = `
      <div class="bg-white rounded-3xl border border-slate-200 shadow-soft p-10 text-center">
        <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <i data-lucide="triangle-alert" class="w-8 h-8 text-red-500"></i>
        </div>
        <h2 class="text-xl font-bold text-brand-navy mb-2">Could not load this module</h2>
        <p class="text-slate-500 mb-6">${escapeHtml(message || "Please try again.")}</p>
        <button class="bg-brand-navy text-white px-5 py-3 rounded-xl font-bold" onclick="Admin.reloadCurrentModule()">Retry</button>
      </div>
    `;
    Edel.initIcons();
  }

  function renderEmptyState(title, message) {
    return `
      <div class="bg-white rounded-2xl border border-slate-200 shadow-soft p-10 text-center">
        <div class="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <i data-lucide="inbox" class="w-7 h-7 text-slate-400"></i>
        </div>
        <h3 class="text-lg font-bold text-brand-navy mb-2">${escapeHtml(title)}</h3>
        <p class="text-sm text-slate-500">${escapeHtml(message)}</p>
      </div>
    `;
  }

  function setAdminIdentity() {
    const user = EdelModules.auth.getUser() || {};
    if (els.adminName) els.adminName.textContent = user.fullName || "Admin";
    if (els.adminEmail) els.adminEmail.textContent = user.email || "";
    if (els.topbarAdminName) els.topbarAdminName.textContent = user.fullName || "Admin";
    if (els.adminAvatar && user.profilePhoto) {
      els.adminAvatar.src = EdelModules.api.buildUrl(user.profilePhoto);
    }
  }

  function updateSidebar() {
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.toggle("active", item.getAttribute("data-module") === state.currentModule);
    });
  }

  function closeSidebarMobile() {
    els.sidebar?.classList.add("-translate-x-full");
    els.sidebarOverlay?.classList.add("hidden");
  }

  function openModal(title, content) {
    els.modalContainer.innerHTML = `
      <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-brand-navy/60 backdrop-blur-sm">
        <div class="bg-white rounded-3xl shadow-floating max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          <div class="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <h3 class="text-xl font-bold text-brand-navy">${escapeHtml(title)}</h3>
            <button class="p-2 hover:bg-slate-100 rounded-full transition-all" onclick="Admin.closeModal()">
              <i data-lucide="x" class="w-6 h-6"></i>
            </button>
          </div>
          <div class="p-6">${content}</div>
        </div>
      </div>
    `;
    els.modalContainer.classList.remove("hidden");
    Edel.initIcons();
  }

  function closeModal() {
    els.modalContainer.classList.add("hidden");
    els.modalContainer.innerHTML = "";
  }

  function previewImage(src, altText = "Image Preview") {
    if (!src) return;
    const previewOverlay = document.createElement("div");
    previewOverlay.className = "fixed inset-0 z-[70] flex flex-col items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md transition-all duration-300 ease-out opacity-0";
    previewOverlay.innerHTML = `
      <div class="relative max-w-4xl w-full max-h-[85vh] flex flex-col items-center justify-center gap-4">
        <button class="absolute -top-14 right-2 p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200 cursor-pointer" id="close-preview-btn">
          <i data-lucide="x" class="w-8 h-8"></i>
        </button>
        <img src="${src}" alt="${escapeHtml(altText)}" class="max-w-full max-h-[75vh] rounded-3xl object-contain shadow-2xl border border-white/10 cursor-zoom-out" id="preview-image-content" />
        <p class="text-white/80 text-sm font-semibold select-none bg-slate-900/60 px-4 py-2 rounded-full border border-white/5 backdrop-blur-sm mt-2">${escapeHtml(altText)}</p>
      </div>
    `;

    function closePreview() {
      previewOverlay.classList.remove("opacity-100");
      previewOverlay.classList.add("opacity-0");
      window.removeEventListener("keydown", handleKeyDown);
      setTimeout(() => {
        previewOverlay.remove();
      }, 300);
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") closePreview();
    }

    previewOverlay.addEventListener("click", (e) => {
      if (e.target === previewOverlay || e.target.id === "preview-image-content") {
        closePreview();
      }
    });

    window.addEventListener("keydown", handleKeyDown);
    document.body.appendChild(previewOverlay);
    Edel.initIcons();

    const closeBtn = previewOverlay.querySelector("#close-preview-btn");
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closePreview();
    });

    requestAnimationFrame(() => {
      previewOverlay.classList.remove("opacity-0");
      previewOverlay.classList.add("opacity-100");
    });
  }

  function getAuthOptions() {
    return {
      headers: EdelModules.auth.getAuthHeaders(),
      silent: true,
    };
  }

  function debounce(fn, wait = 250) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => fn(...args), wait);
    };
  }

  async function fetchDashboard() {
    state.dashboard = await EdelModules.api.get("/api/admin/dashboard", getAuthOptions());
  }

  async function fetchUsers() {
    const params = new URLSearchParams();
    const { search, role, accountStatus } = state.filters.users;
    if (search) params.set("search", search);
    if (role) params.set("role", role);
    if (accountStatus) params.set("accountStatus", accountStatus);
    const response = await EdelModules.api.get(`/api/admin/users?${params.toString()}`, getAuthOptions());
    state.users = response.users || [];
  }

  async function fetchOrders() {
    const params = new URLSearchParams();
    const { search, status, reportedOnly } = state.filters.orders;
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (reportedOnly) params.set("reportedOnly", "true");
    const response = await EdelModules.api.get(`/api/admin/orders?${params.toString()}`, getAuthOptions());
    state.orders = response.orders || [];
  }

  async function fetchReports() {
    const params = new URLSearchParams();
    const { search, status } = state.filters.reports;
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const response = await EdelModules.api.get(`/api/admin/reports?${params.toString()}`, getAuthOptions());
    state.reports = response.reports || [];
  }

  async function fetchSettings() {
    const response = await EdelModules.api.get("/api/admin/settings", getAuthOptions());
    state.settings = response.settings || [];
  }

  async function fetchCategories() {
    const response = await EdelModules.api.get("/api/admin/categories", getAuthOptions());
    state.categories = response || [];
  }

  async function loadCurrentModule() {
    state.loading = true;
    renderLoading();

    try {
      if (state.currentModule === "dashboard") await fetchDashboard();
      if (state.currentModule === "users") await fetchUsers();
      if (state.currentModule === "orders") await fetchOrders();
      if (state.currentModule === "reports") await fetchReports();
      if (state.currentModule === "settings") await fetchSettings();
      if (state.currentModule === "categories") await fetchCategories();

      renderCurrentModule();
    } catch (error) {
      if (error.status === 403) {
        Ui.toast("error", "Access Denied", error.message);
      }
      renderErrorState(error.message);
    } finally {
      state.loading = false;
    }
  }

  function renderStatCard(title, value, icon, color) {
    const colors = {
      blue: "bg-blue-50 text-blue-600",
      green: "bg-green-50 text-green-600",
      red: "bg-red-50 text-red-600",
      amber: "bg-amber-50 text-amber-600",
    };

    return `
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft">
        <div class="flex items-center justify-between mb-4">
          <div class="w-10 h-10 rounded-xl ${colors[color]} flex items-center justify-center">
            <i data-lucide="${icon}" class="w-5 h-5"></i>
          </div>
        </div>
        <p class="text-slate-400 text-sm font-medium mb-1">${escapeHtml(title)}</p>
        <h2 class="text-3xl font-extrabold text-brand-navy">${Number(value || 0).toLocaleString()}</h2>
      </div>
    `;
  }

  function renderDashboard() {
    const data = state.dashboard;
    const recentOrders = data?.recentOrders || [];
    const recentReports = data?.recentReports || [];
    const recentSignups = data?.recentSignups || [];

    els.moduleContainer.innerHTML = `
      <div class="animate-fade-in space-y-8">
        <div>
          <h1 class="text-2xl font-bold text-brand-navy">Platform Overview</h1>
          <p class="text-slate-500 text-sm">Operational snapshot across users, orders, and reports.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          ${renderStatCard("Total Users", data?.stats?.totalUsers, "users", "blue")}
          ${renderStatCard("Active Orders", data?.stats?.totalActiveOrders, "shopping-bag", "green")}
          ${renderStatCard("Open Reports", data?.stats?.totalOpenReports, "alert-circle", "red")}
          ${renderStatCard("Suspended Users", data?.stats?.totalSuspendedUsers, "user-x", "amber")}
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <section class="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
            <div class="p-6 border-b border-slate-100">
              <h3 class="font-bold text-brand-navy text-lg">Recent Orders</h3>
            </div>
            ${recentOrders.length ? `
              <div class="overflow-x-auto">
                <table class="w-full admin-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Provider</th>
                      <th>Service</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${recentOrders.map((order) => `
                      <tr>
                        <td class="font-mono-data text-xs font-bold">${order.id}</td>
                        <td>${escapeHtml(order.customer?.fullName || "—")}</td>
                        <td>${escapeHtml(order.provider?.fullName || "—")}</td>
                        <td>${escapeHtml(order.serviceTitle || "—")}</td>
                        <td>${renderBadge(capitalize(order.status), order.status)}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            ` : renderEmptyState("No recent orders", "Recent order activity will appear here.")}
          </section>

          <section class="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
            <div class="p-6 border-b border-slate-100">
              <h3 class="font-bold text-brand-navy text-lg">Recent Reports</h3>
            </div>
            <div class="p-6 space-y-4">
              ${recentReports.length ? recentReports.map((report) => `
                <button class="w-full text-left p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-red-200 transition-all" onclick="Admin.viewReport(${report.id})">
                  <div class="flex justify-between gap-4 mb-2">
                    <span class="text-[10px] font-mono-data text-slate-400">Order #${report.id}</span>
                    ${renderBadge(capitalize(report.reportStatus || "open"), report.reportStatus || "open")}
                  </div>
                  <p class="text-xs text-brand-navy font-bold mb-1">${escapeHtml(report.customer?.fullName || "Customer")} reported ${escapeHtml(report.provider?.fullName || "provider")}</p>
                  <p class="text-xs text-slate-500 line-clamp-2">${escapeHtml(report.reportMessage || "")}</p>
                </button>
              `).join("") : `<p class="text-sm text-slate-500">No reports yet.</p>`}
            </div>
          </section>
        </div>

        <section class="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
          <div class="p-6 border-b border-slate-100">
            <h3 class="font-bold text-brand-navy text-lg">Recent Signups</h3>
          </div>
          ${recentSignups.length ? `
            <div class="overflow-x-auto">
              <table class="w-full admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentSignups.map((user) => `
                    <tr>
                      <td>${escapeHtml(user.fullName)}</td>
                      <td>${renderBadge(capitalize(user.role), user.role)}</td>
                      <td>${renderBadge(capitalize(user.accountStatus), user.accountStatus)}</td>
                      <td>${formatDate(user.createdAt)}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          ` : renderEmptyState("No signups yet", "New users will appear here.")}
        </section>
      </div>
    `;
    Edel.initIcons();
  }

  function renderUsers() {
    els.moduleContainer.innerHTML = `
      <div class="animate-fade-in space-y-6">
        <div>
          <h1 class="text-2xl font-bold text-brand-navy">Users</h1>
          <p class="text-slate-500 text-sm">Search, inspect, suspend, restore, and promote platform users.</p>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
          <input data-user-filter="search" value="${escapeHtml(state.filters.users.search)}" placeholder="Search name, email, or phone..." class="flex-1 min-w-[220px] px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none" />
          <select data-user-filter="role" class="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm outline-none">
            <option value="">All Roles</option>
            <option value="customer" ${state.filters.users.role === "customer" ? "selected" : ""}>Customer</option>
            <option value="provider" ${state.filters.users.role === "provider" ? "selected" : ""}>Provider</option>
            <option value="both" ${state.filters.users.role === "both" ? "selected" : ""}>Both</option>
            <option value="admin" ${state.filters.users.role === "admin" ? "selected" : ""}>Admin</option>
          </select>
          <select data-user-filter="accountStatus" class="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm outline-none">
            <option value="">All Statuses</option>
            <option value="active" ${state.filters.users.accountStatus === "active" ? "selected" : ""}>Active</option>
            <option value="suspended" ${state.filters.users.accountStatus === "suspended" ? "selected" : ""}>Suspended</option>
          </select>
          <button class="bg-brand-navy text-white px-4 py-2 rounded-xl text-sm font-bold" onclick="Admin.reloadCurrentModule()">Refresh</button>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
          ${state.users.length ? `
            <div class="overflow-x-auto">
              <table class="w-full admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Rating</th>
                    <th>Status</th>
                    <th>Availability</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${state.users.map((user) => `
                    <tr>
                      <td class="font-mono-data text-xs font-bold">${user.id}</td>
                      <td>
                        <div class="flex items-center gap-3">
                          ${buildAvatar(user.fullName, user.profilePhoto, "w-16 h-16 text-lg")}
                          <div>
                            <p class="font-bold text-sm">${escapeHtml(user.fullName)}</p>
                            <p class="text-[10px] text-slate-400">${escapeHtml(user.email)}</p>
                          </div>
                        </div>
                      </td>
                      <td>${renderBadge(capitalize(user.role), user.role)}</td>
                      <td>${Number(user.rating || 0)}%</td>
                      <td>${renderBadge(capitalize(user.accountStatus), user.accountStatus)}</td>
                      <td>${renderBadge(capitalize(user.availabilityStatus || "—"), user.availabilityStatus || "away")}</td>
                      <td>${formatDate(user.createdAt)}</td>
                      <td>
                        <div class="flex items-center gap-2">
                          <button class="p-2 hover:bg-slate-100 rounded-lg" onclick="Admin.viewUser(${user.id})" title="View"><i data-lucide="eye" class="w-4 h-4"></i></button>
                          ${user.accountStatus === "active"
                            ? `<button class="p-2 hover:bg-slate-100 rounded-lg text-red-600" onclick="Admin.suspendUser(${user.id})" title="Suspend"><i data-lucide="user-x" class="w-4 h-4"></i></button>`
                            : `<button class="p-2 hover:bg-slate-100 rounded-lg text-green-600" onclick="Admin.restoreUser(${user.id})" title="Restore"><i data-lucide="user-check" class="w-4 h-4"></i></button>`
                          }
                        </div>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          ` : renderEmptyState("No users found", "Try adjusting your filters or search terms.")}
        </div>
      </div>
    `;
    Edel.initIcons();
  }

  function renderOrders() {
    els.moduleContainer.innerHTML = `
      <div class="animate-fade-in space-y-6">
        <div>
          <h1 class="text-2xl font-bold text-brand-navy">Orders</h1>
          <p class="text-slate-500 text-sm">Inspect order lifecycle, reports, and verification history.</p>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
          <input data-order-filter="search" value="${escapeHtml(state.filters.orders.search)}" placeholder="Search order, user, or service..." class="flex-1 min-w-[220px] px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none" />
          <select data-order-filter="status" class="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm outline-none">
            <option value="">All Statuses</option>
            ${["pending", "accepted", "in_progress", "declined", "cancelled", "completed"].map((status) => `
              <option value="${status}" ${state.filters.orders.status === status ? "selected" : ""}>${capitalize(status)}</option>
            `).join("")}
          </select>
          <label class="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" data-order-filter="reportedOnly" ${state.filters.orders.reportedOnly ? "checked" : ""} />
            Reported only
          </label>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
          ${state.orders.length ? `
            <div class="overflow-x-auto">
              <table class="w-full admin-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Provider</th>
                    <th>Service</th>
                    <th>Status</th>
                    <th>Reported</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${state.orders.map((order) => `
                    <tr>
                      <td class="font-mono-data text-xs font-bold">${order.id}</td>
                      <td>${escapeHtml(order.customer?.fullName || "—")}</td>
                      <td>${escapeHtml(order.provider?.fullName || "—")}</td>
                      <td>${escapeHtml(order.serviceTitle || "—")}</td>
                      <td>${renderBadge(capitalize(order.status), order.status)}</td>
                      <td>${order.reportMessage ? renderBadge(capitalize(order.reportStatus || "open"), order.reportStatus || "open") : "—"}</td>
                      <td>${formatDate(order.createdAt)}</td>
                      <td><button class="p-2 hover:bg-slate-100 rounded-lg" onclick="Admin.viewOrder(${order.id})"><i data-lucide="file-text" class="w-4 h-4"></i></button></td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          ` : renderEmptyState("No orders found", "Try changing the order filters.")}
        </div>
      </div>
    `;
    Edel.initIcons();
  }

  function renderReports() {
    els.moduleContainer.innerHTML = `
      <div class="animate-fade-in space-y-6">
        <div>
          <h1 class="text-2xl font-bold text-brand-navy">Reports</h1>
          <p class="text-slate-500 text-sm">Review customer complaints, leave admin notes, and apply moderation actions.</p>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
          <input data-report-filter="search" value="${escapeHtml(state.filters.reports.search)}" placeholder="Search report text or service..." class="flex-1 min-w-[220px] px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none" />
          <select data-report-filter="status" class="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm outline-none">
            <option value="">All Statuses</option>
            <option value="open" ${state.filters.reports.status === "open" ? "selected" : ""}>Open</option>
            <option value="reviewed" ${state.filters.reports.status === "reviewed" ? "selected" : ""}>Reviewed</option>
            <option value="resolved" ${state.filters.reports.status === "resolved" ? "selected" : ""}>Resolved</option>
          </select>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
          ${state.reports.length ? `
            <div class="overflow-x-auto">
              <table class="w-full admin-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Reported At</th>
                    <th>Customer</th>
                    <th>Provider</th>
                    <th>Service</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${state.reports.map((report) => `
                    <tr>
                      <td class="font-mono-data text-xs font-bold">${report.id}</td>
                      <td>${formatDate(report.reportedAt)}</td>
                      <td>${escapeHtml(report.customer?.fullName || "—")}</td>
                      <td>${escapeHtml(report.provider?.fullName || "—")}</td>
                      <td>${escapeHtml(report.serviceTitle || "—")}</td>
                      <td>${renderBadge(capitalize(report.reportStatus || "open"), report.reportStatus || "open")}</td>
                      <td><button class="p-2 hover:bg-slate-100 rounded-lg" onclick="Admin.viewReport(${report.id})"><i data-lucide="message-square" class="w-4 h-4"></i></button></td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          ` : renderEmptyState("No reports found", "There are no reported orders for the current filter.")}
        </div>
      </div>
    `;
    Edel.initIcons();
  }

  function renderSettings() {
    const settings = state.settings.filter((setting) => {
      const search = state.filters.settings.search.toLowerCase();
      if (!search) return true;
      return setting.key.toLowerCase().includes(search) || (setting.description || "").toLowerCase().includes(search);
    });

    const ratingKeys = ["provider_rating_increment", "provider_report_penalty", "customer_complaint_penalty"];
    const ratingSettings = settings.filter((setting) => ratingKeys.includes(setting.key));
    const operationsSettings = settings.filter((setting) => !ratingKeys.includes(setting.key));

    const renderSettingGroup = (title, items) => `
      <div class="bg-white rounded-2xl border border-slate-200 shadow-soft p-8">
        <h3 class="font-bold text-brand-navy text-lg mb-6">${escapeHtml(title)}</h3>
        <div class="space-y-6">
          ${items.map((setting) => `
            <div>
              <label class="block text-sm font-bold text-brand-navy mb-1" for="setting-${setting.key}">${escapeHtml(capitalize(setting.key))}</label>
              <p class="text-xs text-slate-400 mb-2">${escapeHtml(setting.description || "")}</p>
              ${setting.key === 'enable_categories_view_for_providers' ? `
                <select id="setting-${setting.key}" data-setting-key="${setting.key}" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm">
                  <option value="1" ${Number(setting.value) === 1 ? 'selected' : ''}>Yes (Group into Categories)</option>
                  <option value="0" ${Number(setting.value) === 0 ? 'selected' : ''}>No (Show Direct Services List)</option>
                </select>
              ` : `
                <input type="number" step="0.01" id="setting-${setting.key}" data-setting-key="${setting.key}" value="${escapeHtml(setting.value)}" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm">
              `}
              <p class="text-[10px] text-slate-400 mt-2">Last updated: ${formatDate(setting.updatedAt)}</p>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    els.moduleContainer.innerHTML = `
      <div class="animate-fade-in space-y-6">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-brand-navy">Settings</h1>
            <p class="text-slate-500 text-sm">Edit the core values that drive verification, fees, and ratings.</p>
          </div>
          <button class="bg-brand-navy text-white px-6 py-3 rounded-xl font-bold" onclick="Admin.saveSettings()">Save Changes</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          ${renderSettingGroup("Ratings", ratingSettings)}
          ${renderSettingGroup("Operations", operationsSettings)}
        </div>
      </div>
    `;
    Edel.initIcons();
  }

  function renderEmailPreview() {
    const to = state.emailComposer.to || "recipient@email.com";
    const subject = state.emailComposer.subject || "Your subject line appears here";
    const message = state.emailComposer.message || "Your message content will appear here.";
    const paragraphs = message
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    return `
      <div class="overflow-hidden rounded-[28px] border border-slate-200 bg-[#F8FAFC] shadow-soft">
        <div class="bg-gradient-to-br from-brand-navy to-brand-blue px-6 py-6">
          <div class="flex items-center justify-between gap-4 mb-6">
            <div class="w-10 h-10 rounded-xl bg-brand-accent flex items-center justify-center text-brand-navy">
              <i data-lucide="sparkles" class="w-5 h-5"></i>
            </div>
            <span class="text-[10px] font-bold uppercase tracking-[0.24em] text-brand-accent">Email Preview</span>
          </div>
          <p class="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent mb-2">E-del Admin</p>
          <h3 class="text-2xl font-extrabold text-white leading-tight">${escapeHtml(subject)}</h3>
          <p class="text-white/80 text-sm mt-3">Designed to match the E-del brand palette and render cleanly in major email clients.</p>
        </div>

        <div class="bg-white px-6 py-7">
          <div class="flex items-start gap-3 mb-6">
            <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-brand-navy font-bold text-xs border border-slate-200">
              A
            </div>
            <div class="min-w-0">
              <p class="text-sm font-bold text-brand-navy">Admin Broadcast</p>
              <p class="text-xs text-slate-400 truncate">To: ${escapeHtml(to)}</p>
            </div>
          </div>

          <div class="space-y-4 text-sm leading-7 text-slate-700">
            ${paragraphs.length ? paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("") : "<p>Your message content will appear here.</p>"}
          </div>

          <div class="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-accent px-5 py-3 text-sm font-extrabold text-brand-navy shadow-glow">
            <i data-lucide="send" class="w-4 h-4"></i>
            Send Message
          </div>

          <div class="mt-6 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-1">Footer Note</p>
            <p class="text-xs text-slate-500">This email uses the branded E-del template and SendPulse API delivery.</p>
          </div>
        </div>
      </div>
    `;
  }

  function updateEmailPreview() {
    const preview = document.getElementById("custom-email-preview");
    if (!preview) return;
    preview.innerHTML = renderEmailPreview();
    Edel.initIcons();
  }

  const commonLucideIcons = [
    'sparkles', 'wrench', 'scissors', 'book-open', 'shirt', 'laptop', 'home', 'truck',
    'zap', 'briefcase', 'camera', 'music', 'video', 'coffee', 'pen-tool', 'paint-brush',
    'hammer', 'droplet', 'leaf', 'sun', 'moon', 'star', 'heart', 'shield', 'key',
    'lock', 'unlock', 'phone', 'mail', 'map-pin', 'navigation', 'compass', 'globe',
    'shopping-bag', 'shopping-cart', 'gift', 'tag', 'credit-card', 'dollar-sign', 'percent',
    'award', 'medal', 'thumbs-up', 'thumbs-down', 'smile', 'frown', 'user', 'users'
  ];

  function renderCategories() {
    const categories = state.categories || [];
    
    els.moduleContainer.innerHTML = `
      <div class="animate-fade-in space-y-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 class="text-2xl font-extrabold text-brand-navy">Service Categories</h2>
            <p class="text-slate-500 text-sm mt-1">Manage platform service categories and icons</p>
          </div>
          <button onclick="Admin.openCategoryModal()" class="bg-brand-navy text-brand-accent px-4 py-2 rounded-xl font-bold hover:bg-brand-blue transition-colors flex items-center gap-2">
            <i data-lucide="plus" class="w-4 h-4"></i> Add Category
          </button>
        </div>

        <div class="bg-white rounded-[28px] border border-slate-200 shadow-soft overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm whitespace-nowrap">
              <thead class="bg-slate-50/50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th class="px-6 py-4 font-bold">Category</th>
                  <th class="px-6 py-4 font-bold">Icon</th>
                  <th class="px-6 py-4 font-bold">Status</th>
                  <th class="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${categories.length === 0 ? `
                  <tr><td colspan="4" class="px-6 py-8 text-center text-slate-400">No categories found.</td></tr>
                ` : categories.map(cat => `
                  <tr class="hover:bg-slate-50/50 transition-colors">
                    <td class="px-6 py-4 font-bold text-brand-navy capitalize">${escapeHtml(cat.name)}</td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        <div class="w-8 h-8 bg-brand-light rounded-lg flex items-center justify-center">
                          <i data-lucide="${cat.iconName}" class="w-4 h-4 text-brand-navy"></i>
                        </div>
                        <span class="text-xs text-slate-500">${cat.iconName}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                        ${cat.isActive ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <button onclick="Admin.openCategoryModal(${cat.id})" class="text-brand-navy hover:text-brand-blue p-2">
                        <i data-lucide="edit-2" class="w-4 h-4"></i>
                      </button>
                      <button onclick="Admin.deleteCategory(${cat.id})" class="text-red-500 hover:text-red-600 p-2">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    Edel.initIcons();
  }

  window.selectCategoryIcon = function(iconName) {
    document.getElementById('cat-icon-input').value = iconName;
    document.querySelectorAll('.icon-option').forEach(el => el.classList.remove('ring-2', 'ring-brand-accent', 'bg-brand-light'));
    document.getElementById(`icon-opt-${iconName}`).classList.add('ring-2', 'ring-brand-accent', 'bg-brand-light');
  };

  async function openCategoryModal(id = null) {
    const category = id ? state.categories.find(c => c.id === id) : null;
    const title = category ? "Edit Category" : "Add Category";
    const defaultIcon = category ? category.iconName : 'sparkles';
    
    openModal(title, `
      <form onsubmit="event.preventDefault(); Admin.saveCategory(${id});" class="space-y-6">
        <div>
          <label class="block text-sm font-bold text-brand-navy mb-2">Category Name</label>
          <input type="text" id="cat-name-input" value="${category ? escapeHtml(category.name) : ''}" required class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-accent focus:bg-white transition-all text-sm" placeholder="e.g. plumbing">
        </div>
        
        <div>
          <label class="block text-sm font-bold text-brand-navy mb-2">Select Icon</label>
          <input type="hidden" id="cat-icon-input" value="${defaultIcon}">
          <div class="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
            ${commonLucideIcons.map(icon => `
              <div id="icon-opt-${icon}" onclick="selectCategoryIcon('${icon}')" class="icon-option w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-all ${defaultIcon === icon ? 'ring-2 ring-brand-accent bg-brand-light' : ''}" title="${icon}">
                <i data-lucide="${icon}" class="w-5 h-5 text-brand-navy"></i>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="flex items-center gap-3">
          <input type="checkbox" id="cat-active-input" ${!category || category.isActive ? 'checked' : ''} class="w-4 h-4 text-brand-accent rounded border-slate-300 focus:ring-brand-accent">
          <label for="cat-active-input" class="text-sm font-bold text-brand-navy">Active (Visible to users)</label>
        </div>

        <button type="submit" class="w-full bg-brand-navy text-brand-accent py-4 rounded-xl font-bold hover:bg-brand-blue transition-colors">
          ${category ? 'Save Changes' : 'Create Category'}
        </button>
      </form>
    `);
    setTimeout(() => Edel.initIcons(), 100);
  }

  async function saveCategory(id) {
    const name = document.getElementById("cat-name-input").value;
    const iconName = document.getElementById("cat-icon-input").value;
    const isActive = document.getElementById("cat-active-input").checked;

    try {
      if (id) {
        await EdelModules.api.put(`/api/admin/categories/${id}`, { name, iconName, isActive }, getAuthOptions());
        Ui.toast("success", "Category Updated", "The category has been updated successfully.");
      } else {
        await EdelModules.api.post("/api/admin/categories", { name, iconName, isActive }, getAuthOptions());
        Ui.toast("success", "Category Created", "New category has been added.");
      }
      closeModal();
      await loadCurrentModule();
    } catch (error) {
      Ui.toast("error", "Error", error.message);
    }
  }

  async function deleteCategory(id) {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await EdelModules.api.delete(`/api/admin/categories/${id}`, getAuthOptions());
      Ui.toast("success", "Deleted", "Category has been removed.");
      await loadCurrentModule();
    } catch (error) {
      Ui.toast("error", "Error", error.message);
    }
  }

  function renderEmails() {
    const composer = state.emailComposer;
    const emailSendFeedback = state.emailSendFeedback;

    els.moduleContainer.innerHTML = `
      <div class="animate-fade-in space-y-6">
        <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-brand-navy">Emails</h1>
            <p class="text-slate-500 text-sm">Send branded custom emails directly through SendPulse using the admin dashboard.</p>
          </div>
          <div class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Use this for manual announcements, account notices, and one-off customer communication.
          </div>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
          <section class="bg-white rounded-[28px] border border-slate-200 shadow-soft p-6 md:p-8">
            ${emailSendFeedback ? `
              <div class="mb-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-4">
                <div class="flex items-start gap-3">
                  <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 shrink-0">
                    <i data-lucide="circle-check-big" class="w-5 h-5"></i>
                  </div>
                  <div>
                    <p class="font-bold text-green-800">${escapeHtml(emailSendFeedback.title || "Email sent")}</p>
                    <p class="text-sm text-green-700 mt-1">${escapeHtml(emailSendFeedback.message || "The email was delivered successfully.")}</p>
                  </div>
                </div>
              </div>
            ` : ""}
            <div class="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 class="text-lg font-bold text-brand-navy">Compose Email</h2>
                <p class="text-sm text-slate-500">Fill in the recipient, subject, and message.</p>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-brand-navy text-brand-accent flex items-center justify-center shadow-glow-purple">
                <i data-lucide="pen-line" class="w-5 h-5"></i>
              </div>
            </div>

            <form id="custom-email-form" class="space-y-5">
              <div>
                <label for="custom-email-to" class="block text-sm font-bold text-brand-navy mb-2">Destination Email</label>
                <input
                  id="custom-email-to"
                  data-email-field="to"
                  type="email"
                  inputmode="email"
                  autocomplete="email"
                  placeholder="customer@example.com"
                  value="${escapeAttribute(composer.to)}"
                  class="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm focus:border-brand-accent focus:bg-white transition-all"
                  required
                />
                <p class="text-xs text-slate-400 mt-2">The message will be sent to this address only.</p>
              </div>

              <div>
                <label for="custom-email-subject" class="block text-sm font-bold text-brand-navy mb-2">Subject</label>
                <input
                  id="custom-email-subject"
                  data-email-field="subject"
                  type="text"
                  autocomplete="off"
                  placeholder="Service update from E-del"
                  value="${escapeAttribute(composer.subject)}"
                  class="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm focus:border-brand-accent focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label for="custom-email-message" class="block text-sm font-bold text-brand-navy mb-2">Message</label>
                <textarea
                  id="custom-email-message"
                  data-email-field="message"
                  placeholder="Write the email body here. Use line breaks to separate paragraphs."
                  class="w-full min-h-[220px] px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm leading-7 focus:border-brand-accent focus:bg-white transition-all resize-y"
                  required
                >${escapeHtml(composer.message)}</textarea>
                <p class="text-xs text-slate-400 mt-2">The email uses a branded HTML template with a yellow CTA and navy header.</p>
              </div>

              <div class="flex flex-col sm:flex-row gap-3 pt-2">
                <button type="submit" class="flex-1 bg-brand-accent hover:bg-brand-accentHover text-brand-navy px-5 py-3.5 rounded-2xl font-extrabold shadow-glow transition-all">
                  Send Email
                </button>
                <button type="button" class="px-5 py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all" onclick="Admin.clearEmailComposer()">
                  Clear
                </button>
              </div>
            </form>
          </section>

          <aside class="space-y-6">
            <div class="bg-white rounded-[28px] border border-slate-200 shadow-soft p-5 md:p-6">
              <div class="flex items-center justify-between gap-3 mb-4">
                <h3 class="text-lg font-bold text-brand-navy">Live Preview</h3>
                <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Rendered HTML</span>
              </div>
              <div id="custom-email-preview">
                ${renderEmailPreview()}
              </div>
            </div>

            <div class="rounded-[28px] border border-brand-accent/30 bg-brand-navy p-6 text-white shadow-floating">
              <p class="text-xs font-bold uppercase tracking-[0.22em] text-brand-accent mb-3">Guidelines</p>
              <ul class="space-y-3 text-sm text-white/85 leading-6">
                <li>Keep subjects short and specific.</li>
                <li>Use concise paragraphs for best mobile rendering.</li>
                <li>Send to one recipient at a time for custom notices.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    `;

    Edel.initIcons();
    updateEmailPreview();
  }

  function renderCurrentModule() {
    updateSidebar();
    if (els.globalSearch) {
      els.globalSearch.value = state.filters[state.currentModule]?.search || "";
    }

    if (state.currentModule === "dashboard") renderDashboard();
    if (state.currentModule === "users") renderUsers();
    if (state.currentModule === "orders") renderOrders();
    if (state.currentModule === "reports") renderReports();
    if (state.currentModule === "settings") renderSettings();
    if (state.currentModule === "emails") renderEmails();
    if (state.currentModule === "categories") renderCategories();
  }

  async function switchModule(moduleName) {
    state.currentModule = moduleName;
    closeSidebarMobile();
    await loadCurrentModule();
  }

  async function viewUser(id) {
    try {
      const response = await EdelModules.api.get(`/api/admin/users/${id}`, getAuthOptions());
      const user = response.user;
      state.currentUserDetail = user;

      openModal("User Details", `
        <div class="space-y-8">
          <div class="flex items-center gap-4">
            ${buildAvatar(user.fullName, user.profilePhoto, "w-16 h-16 text-lg")}
            <div>
              <h4 class="text-2xl font-bold text-brand-navy">${escapeHtml(user.fullName)}</h4>
              <p class="text-slate-500">${escapeHtml(user.email)}</p>
              <div class="flex flex-wrap gap-2 mt-2">
                ${renderBadge(capitalize(user.role), user.role)}
                ${renderBadge(capitalize(user.accountStatus), user.accountStatus)}
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p class="text-[10px] font-bold text-slate-400 uppercase mb-2">Profile</p>
              <p class="text-sm"><strong>Phone:</strong> ${escapeHtml(user.phoneNumber || "—")}</p>
              <p class="text-sm"><strong>Location:</strong> ${escapeHtml(user.locationLabel || "—")}</p>
              <p class="text-sm"><strong>Tier:</strong> ${escapeHtml(capitalize(user.tier))}</p>
              <p class="text-sm"><strong>Rating:</strong> ${Number(user.rating || 0)}%</p>
              <p class="text-sm"><strong>Jobs Completed:</strong> ${Number(user.jobsCompleted || 0)}</p>
              <p class="text-sm"><strong>Referrals:</strong> <span class="font-extrabold text-amber-600">${Number(user.referralCount || 0)}</span> ${user.referralCode ? `<span class="text-xs font-mono text-slate-400">(${escapeHtml(user.referralCode)})</span>` : ''}</p>
              <p class="text-sm"><strong>Availability:</strong> ${escapeHtml(capitalize(user.availabilityStatus || "—"))}</p>
              <p class="text-sm"><strong>Joined:</strong> ${formatDate(user.createdAt)}</p>
            </div>
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p class="text-[10px] font-bold text-slate-400 uppercase mb-2">Admin State</p>
              <p class="text-sm"><strong>Account Status:</strong> ${escapeHtml(capitalize(user.accountStatus))}</p>
              <p class="text-sm"><strong>Suspended At:</strong> ${formatDate(user.suspendedAt)}</p>
              <p class="text-sm"><strong>Suspension Reason:</strong> ${escapeHtml(user.suspensionReason || "—")}</p>
            </div>
          </div>


          <!-- Face Verification -->
          <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p class="text-[10px] font-bold text-slate-400 uppercase mb-3">Face Verification</p>
            <div class="flex items-center gap-4">
              ${user.facePhoto
                ? `<img
                    src="${EdelModules.api.buildUrl(user.facePhoto)}"
                    alt="Face capture"
                    class="w-16 h-16 rounded-full object-cover border-2 border-brand-navy shadow-sm shrink-0 cursor-pointer hover:scale-105 hover:border-brand-blue transition-all duration-200"
                    onclick="Admin.previewImage('${EdelModules.api.buildUrl(user.facePhoto)}', '${escapeHtml(user.fullName)} Face Capture')"
                    onerror="this.outerHTML='<div class=\\\'w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center shrink-0 border-2 border-slate-300\\\'><i data-lucide=\\\'user\\\' class=\\\'w-7 h-7 text-slate-400\\\'></i></div>'"
                  />` : `<div class="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center shrink-0 border-2 border-slate-300">
                    <i data-lucide="user" class="w-7 h-7 text-slate-400"></i>
                  </div>`
              }
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  ${user.faceVerified
                    ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700"><i data-lucide="shield-check" class="w-3.5 h-3.5"></i> Face Verified</span>`
                    : `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700"><i data-lucide="shield-alert" class="w-3.5 h-3.5"></i> Not Verified</span>`
                  }
                </div>
                <p class="text-xs text-slate-500">
                  ${user.faceVerified
                    ? 'This user has completed face capture. They can place and accept orders.'
                    : 'This user has not submitted a face photo. They cannot place or accept orders until they do.'
                  }
                </p>
              </div>
            </div>
          </div>
          <div class="space-y-3">
            <h5 class="text-sm font-bold text-brand-navy">Services</h5>
            ${user.services?.length ? `
              <div class="space-y-3">
                ${user.services.map((service) => `
                  <div class="p-4 border border-slate-200 rounded-2xl">
                    <div class="flex justify-between gap-4">
                      <div>
                        <p class="font-bold text-brand-navy">${escapeHtml(service.title)}</p>
                        <p class="text-xs text-slate-500">${escapeHtml(service.category)} • ${formatCurrency(service.basePrice)}</p>
                        ${service.disabledReason ? `<p class="text-[10px] text-red-500 mt-1 italic">Reason: ${escapeHtml(service.disabledReason)}</p>` : ''}
                      </div>
                      <div class="flex items-center gap-3">
                        ${renderBadge(capitalize(service.serviceStatus), service.serviceStatus)}
                        ${service.serviceStatus === 'active'
                          ? `<button class="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all" onclick="Admin.disableService(${service.id}, true)" title="Disable Service"><i data-lucide="ban" class="w-4 h-4"></i></button>`
                          : `<button class="text-green-500 hover:bg-green-50 p-1.5 rounded-lg transition-all" onclick="Admin.restoreService(${service.id}, true)" title="Restore Service"><i data-lucide="check-circle" class="w-4 h-4"></i></button>`
                        }
                      </div>
                    </div>
                  </div>
                `).join("")}
              </div>
            ` : `<p class="text-sm text-slate-500">No services linked to this user.</p>`}
          </div>

          <div class="space-y-3">
            <h5 class="text-sm font-bold text-brand-navy">Quick Actions</h5>
            <div class="flex flex-wrap gap-3">
              ${user.accountStatus === "active"
                ? `<button class="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold" onclick="Admin.suspendUser(${user.id}, true)">Suspend Account</button>`
                : `<button class="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold" onclick="Admin.restoreUser(${user.id}, true)">Restore Account</button>`
              }
              ${user.role !== "admin"
                ? `<button class="px-4 py-2 bg-brand-navy text-white rounded-xl text-sm font-bold" onclick="Admin.promoteToAdmin(${user.id})">Promote To Admin</button>`
                : ""
              }
            </div>
          </div>
        </div>
      `);
    } catch (error) {
      Ui.toast("error", "User Load Failed", error.message);
    }
  }

  async function viewOrder(id) {
    try {
      const response = await EdelModules.api.get(`/api/admin/orders/${id}`, getAuthOptions());
      const order = response.order;
      state.currentOrderDetail = order;

      openModal("Order Details", `
        <div class="space-y-8">
          <div class="flex justify-between gap-4 items-start">
            <div>
              <p class="text-[10px] font-mono-data text-slate-400 uppercase mb-1">Order #${order.id}</p>
              <h4 class="text-2xl font-bold text-brand-navy">${escapeHtml(order.serviceTitle)}</h4>
              <p class="text-sm text-slate-500">${escapeHtml(order.serviceCategory)} • ${formatCurrency(order.basePrice)}</p>
            </div>
            ${renderBadge(capitalize(order.status), order.status)}
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p class="text-[10px] font-bold text-slate-400 uppercase mb-2">Customer</p>
              <p class="font-bold text-brand-navy">${escapeHtml(order.customer?.fullName || "—")}</p>
              <p class="text-sm text-slate-500">${escapeHtml(order.customer?.phoneNumber || "—")}</p>
              <p class="text-sm text-slate-500">${escapeHtml(order.customerLocationLabel || "—")}</p>
            </div>
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p class="text-[10px] font-bold text-slate-400 uppercase mb-2">Provider</p>
              <p class="font-bold text-brand-navy">${escapeHtml(order.provider?.fullName || "—")}</p>
              <p class="text-sm text-slate-500">${escapeHtml(order.provider?.phoneNumber || "—")}</p>
              <p class="text-sm text-slate-500">${escapeHtml(order.provider?.locationLabel || "—")}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div class="p-4 border border-slate-200 rounded-2xl">
              <p><strong>Created:</strong> ${formatDate(order.createdAt)}</p>
              <p><strong>Accepted:</strong> ${formatDate(order.acceptedAt)}</p>
              <p><strong>Started:</strong> ${formatDate(order.startedAt)}</p>
              <p><strong>Cancelled:</strong> ${formatDate(order.cancelledAt)}</p>
              <p><strong>Declined:</strong> ${formatDate(order.declinedAt)}</p>
            </div>
            <div class="p-4 border border-slate-200 rounded-2xl">
              <p><strong>Cancellation Reason:</strong> ${escapeHtml(order.cancellationReason || "—")}</p>
              <p><strong>Report Status:</strong> ${escapeHtml(capitalize(order.reportStatus || "none"))}</p>
              <p><strong>Report Resolution:</strong> ${escapeHtml(capitalize(order.reportResolution || "—"))}</p>
              <p><strong>Reviewed At:</strong> ${formatDate(order.reviewedAt)}</p>
            </div>
          </div>

          <div class="space-y-3">
            <h5 class="text-sm font-bold text-brand-navy">Verification History</h5>
            ${order.verifications?.length ? order.verifications.map((verification) => `
              <div class="p-4 bg-green-50 rounded-2xl border border-green-100">
                <p class="text-sm font-bold text-green-700">QR verification successful</p>
                <p class="text-xs text-green-600">Verified at ${formatDate(verification.verifiedAt)} • Distance ${verification.distance}m • Provider accuracy ${verification.providerAccuracy}m</p>
              </div>
            `).join("") : `<p class="text-sm text-slate-500">No verification record for this order.</p>`}
          </div>

          ${order.reportMessage ? `
            <div class="p-4 bg-red-50 rounded-2xl border border-red-100">
              <p class="text-sm font-bold text-red-700 mb-1">Customer Report</p>
              <p class="text-sm text-red-700">${escapeHtml(order.reportMessage)}</p>
            </div>
          ` : ""}
        </div>
      `);
    } catch (error) {
      Ui.toast("error", "Order Load Failed", error.message);
    }
  }

  async function viewReport(id) {
    try {
      const response = await EdelModules.api.get(`/api/admin/reports/${id}`, getAuthOptions());
      const report = response.report;
      state.currentReportDetail = report;

      openModal("Report Review", `
        <div class="space-y-8">
          <div class="flex justify-between gap-4 items-start">
            <div>
              <p class="text-[10px] font-mono-data text-slate-400 uppercase mb-1">Reported Order #${report.id}</p>
              <h4 class="text-2xl font-bold text-brand-navy">${escapeHtml(report.serviceTitle)}</h4>
              <p class="text-sm text-slate-500">Reported ${formatDate(report.reportedAt)}</p>
            </div>
            ${renderBadge(capitalize(report.reportStatus || "open"), report.reportStatus || "open")}
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p class="text-[10px] font-bold text-slate-400 uppercase mb-2">Customer</p>
              <p class="font-bold text-brand-navy">${escapeHtml(report.customer?.fullName || "—")}</p>
              <p class="text-sm text-slate-500">${escapeHtml(report.customer?.phoneNumber || "—")}</p>
            </div>
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p class="text-[10px] font-bold text-slate-400 uppercase mb-2">Provider</p>
              <p class="font-bold text-brand-navy">${escapeHtml(report.provider?.fullName || "—")}</p>
              <p class="text-sm text-slate-500">${escapeHtml(report.provider?.phoneNumber || "—")}</p>
            </div>
          </div>

          <div class="p-4 bg-red-50 rounded-2xl border border-red-100">
            <p class="text-sm font-bold text-red-700 mb-2">Complaint Message</p>
            <p class="text-sm text-red-700">${escapeHtml(report.reportMessage || "—")}</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div class="p-4 border border-slate-200 rounded-2xl">
              <p><strong>Service:</strong> ${escapeHtml(report.serviceTitle || "—")}</p>
              <p><strong>Category:</strong> ${escapeHtml(report.serviceCategory || "—")}</p>
              <p><strong>Base Price:</strong> ${formatCurrency(report.basePrice)}</p>
              <p><strong>Order Status:</strong> ${escapeHtml(capitalize(report.status))}</p>
            </div>
            <div class="p-4 border border-slate-200 rounded-2xl">
              <p><strong>Verification Records:</strong> ${report.verifications?.length || 0}</p>
              <p><strong>Current Resolution:</strong> ${escapeHtml(capitalize(report.reportResolution || "—"))}</p>
              <p><strong>Reviewed At:</strong> ${formatDate(report.reviewedAt)}</p>
            </div>
          </div>

          <div class="space-y-4">
            <h5 class="text-sm font-bold text-brand-navy">Resolve This Report</h5>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-bold text-brand-navy mb-2">Review Status</label>
                <select id="report-status-select" class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <option value="reviewed" ${report.reportStatus === "reviewed" ? "selected" : ""}>Reviewed</option>
                  <option value="resolved" ${!report.reportStatus || report.reportStatus === "resolved" || report.reportStatus === "open" ? "selected" : ""}>Resolved</option>
                  <option value="open" ${report.reportStatus === "open" ? "selected" : ""}>Open</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-bold text-brand-navy mb-2">Admin Action</label>
                <select id="report-resolution-select" class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl">
                  ${ADMIN_REPORT_ACTIONS.map((action) => `
                    <option value="${action.value}" ${report.reportResolution === action.value ? "selected" : ""}>${action.label}</option>
                  `).join("")}
                </select>
              </div>
            </div>
            <div>
              <label class="block text-sm font-bold text-brand-navy mb-2">Admin Note</label>
              <textarea id="report-admin-note" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl h-32 outline-none" placeholder="Summarize the review and justify the action.">${escapeHtml(report.adminNote || "")}</textarea>
            </div>
            <button class="w-full bg-brand-navy text-white font-bold py-4 rounded-xl" onclick="Admin.submitReportReview(${report.id})">Save Report Review</button>
          </div>
        </div>
      `);
    } catch (error) {
      Ui.toast("error", "Report Load Failed", error.message);
    }
  }

  async function suspendUser(id, fromModal = false) {
    const reason = window.prompt("Enter a suspension reason:");
    if (!reason || !reason.trim()) return;

    try {
      await EdelModules.api.post(`/api/admin/users/${id}/suspend`, { reason: reason.trim() }, getAuthOptions());
      Ui.toast("success", "User Suspended", "The account has been suspended.");
      if (fromModal) closeModal();
      await loadCurrentModule();
    } catch (error) {
      Ui.toast("error", "Suspend Failed", error.message);
    }
  }

  async function restoreUser(id, fromModal = false) {
    try {
      await EdelModules.api.post(`/api/admin/users/${id}/restore`, {}, getAuthOptions());
      Ui.toast("success", "User Restored", "The account has been restored.");
      if (fromModal) closeModal();
      await loadCurrentModule();
    } catch (error) {
      Ui.toast("error", "Restore Failed", error.message);
    }
  }

  async function promoteToAdmin(id) {
    try {
      await EdelModules.api.post(`/api/admin/users/${id}/make-admin`, {}, getAuthOptions());
      Ui.toast("success", "User Promoted", "The user is now an admin.");
      closeModal();
      await loadCurrentModule();
    } catch (error) {
      Ui.toast("error", "Promotion Failed", error.message);
    }
  }

  async function submitReportReview(id) {
    const status = document.getElementById("report-status-select")?.value || "resolved";
    const resolution = document.getElementById("report-resolution-select")?.value || "no_action";
    const adminNote = document.getElementById("report-admin-note")?.value.trim() || "";

    if (!adminNote) {
      Ui.toast("warning", "Admin Note Required", "Enter an admin note before saving.");
      return;
    }

    try {
      await EdelModules.api.post(`/api/admin/reports/${id}/review`, {
        status,
        resolution,
        adminNote,
      }, getAuthOptions());
      Ui.toast("success", "Report Updated", "The report review was saved.");
      closeModal();
      await loadCurrentModule();
    } catch (error) {
      Ui.toast("error", "Review Failed", error.message);
    }
  }

  async function disableService(id, refreshUser = false) {
    const reason = window.prompt("Enter a reason for disabling this service:");
    if (!reason || !reason.trim()) return;

    try {
      await EdelModules.api.post(`/api/admin/services/${id}/disable`, { reason: reason.trim() }, getAuthOptions());
      Ui.toast("success", "Service Disabled", "The service has been disabled.");
      if (refreshUser && state.currentUserDetail) {
        viewUser(state.currentUserDetail.id);
      }
      await loadCurrentModule();
    } catch (error) {
      Ui.toast("error", "Disable Failed", error.message);
    }
  }

  async function restoreService(id, refreshUser = false) {
    try {
      await EdelModules.api.post(`/api/admin/services/${id}/restore`, {}, getAuthOptions());
      Ui.toast("success", "Service Restored", "The service has been restored.");
      if (refreshUser && state.currentUserDetail) {
        viewUser(state.currentUserDetail.id);
      }
      await loadCurrentModule();
    } catch (error) {
      Ui.toast("error", "Restore Failed", error.message);
    }
  }

  async function saveSettings() {
    const inputs = Array.from(document.querySelectorAll("[data-setting-key]"));
    const payload = {};

    inputs.forEach((input) => {
      payload[input.dataset.settingKey] = input.value;
    });

    try {
      const response = await EdelModules.api.put("/api/admin/settings", payload, getAuthOptions());
      state.settings = response.settings || [];
      Ui.toast("success", "Settings Saved", response.message || "Settings updated.");
      renderSettings();
    } catch (error) {
      Ui.toast("error", "Save Failed", error.message);
    }
  }

  function syncEmailComposer() {
    const to = document.getElementById("custom-email-to")?.value.trim() || "";
    const subject = document.getElementById("custom-email-subject")?.value.trim() || "";
    const message = document.getElementById("custom-email-message")?.value || "";

    state.emailComposer = { to, subject, message };
    updateEmailPreview();
  }

  async function sendCustomEmail() {
    const to = document.getElementById("custom-email-to")?.value.trim() || "";
    const subject = document.getElementById("custom-email-subject")?.value.trim() || "";
    const message = document.getElementById("custom-email-message")?.value.trim() || "";

    if (!to || !subject || !message) {
      Ui.toast("warning", "Missing Fields", "Fill in the destination email, subject, and message.");
      return;
    }

    try {
      await EdelModules.api.post("/api/admin/emails/send", { to, subject, message }, getAuthOptions());
      const recipient = to;
      state.emailSendFeedback = {
        title: "Email sent successfully",
        message: `The message was sent to ${recipient}.`,
      };
      Ui.toast("success", "Email Sent", `The message was sent to ${recipient}.`, { timer: 6000 });
      state.emailComposer = { to: "", subject: "", message: "" };
      renderEmails();
    } catch (error) {
      Ui.toast("error", "Send Failed", error.message);
    }
  }

  function clearEmailComposer() {
    state.emailComposer = { to: "", subject: "", message: "" };
    state.emailSendFeedback = null;
    renderEmails();
  }

  function bindStaticEvents() {
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", () => {
        switchModule(item.getAttribute("data-module"));
      });
    });

    els.logoutButton?.addEventListener("click", () => EdelModules.auth.logout());

    els.sidebarToggle?.addEventListener("click", () => {
      els.sidebar?.classList.toggle("-translate-x-full");
      els.sidebarOverlay?.classList.toggle("hidden");
    });

    els.sidebarOverlay?.addEventListener("click", closeSidebarMobile);

    els.modalContainer?.addEventListener("click", (event) => {
      if (event.target === els.modalContainer.firstElementChild) {
        closeModal();
      }
    });

    document.addEventListener("input", (event) => {
      const emailField = event.target.closest("[data-email-field]");
      if (emailField) {
        syncEmailComposer();
      }
    });

    els.globalSearch?.addEventListener("input", debounce((event) => {
      const value = event.target.value.trim();
      if (state.filters[state.currentModule]) {
        state.filters[state.currentModule].search = value;
      }
      loadCurrentModule();
    }, 300));

    document.addEventListener("change", (event) => {
      const emailField = event.target.closest("[data-email-field]");
      if (emailField) {
        syncEmailComposer();
        return;
      }

      const userFilter = event.target.closest("[data-user-filter]");
      if (userFilter) {
        state.filters.users[userFilter.dataset.userFilter] =
          userFilter.type === "checkbox" ? userFilter.checked : userFilter.value;
        loadCurrentModule();
        return;
      }

      const orderFilter = event.target.closest("[data-order-filter]");
      if (orderFilter) {
        state.filters.orders[orderFilter.dataset.orderFilter] =
          orderFilter.type === "checkbox" ? orderFilter.checked : orderFilter.value;
        loadCurrentModule();
        return;
      }

      const reportFilter = event.target.closest("[data-report-filter]");
      if (reportFilter) {
        state.filters.reports[reportFilter.dataset.reportFilter] = reportFilter.value;
        loadCurrentModule();
      }
    });

    document.addEventListener("input", debounce((event) => {
      const emailField = event.target.closest("[data-email-field]");
      if (emailField) {
        syncEmailComposer();
        return;
      }

      const userFilter = event.target.closest("[data-user-filter='search']");
      if (userFilter) {
        state.filters.users.search = userFilter.value.trim();
        loadCurrentModule();
        return;
      }

      const orderFilter = event.target.closest("[data-order-filter='search']");
      if (orderFilter) {
        state.filters.orders.search = orderFilter.value.trim();
        loadCurrentModule();
        return;
      }

      const reportFilter = event.target.closest("[data-report-filter='search']");
      if (reportFilter) {
        state.filters.reports.search = reportFilter.value.trim();
        loadCurrentModule();
      }
    }, 300));

    document.addEventListener("submit", (event) => {
      if (event.target && event.target.id === "custom-email-form") {
        event.preventDefault();
        sendCustomEmail();
      }
    });
  }

  async function init() {
    const user = EdelModules.auth.getUser();
    if (user?.role !== "admin") {
      Ui.toast("error", "Admin Access Required", "Only admin accounts can use this page.");
      window.location.href = "/discovery/";
      return;
    }

    setAdminIdentity();
    bindStaticEvents();
    await loadCurrentModule();
  }

  return {
    init,
    closeModal,
    previewImage,
    switchModule,
    reloadCurrentModule: loadCurrentModule,
    viewUser,
    viewOrder,
    viewReport,
    suspendUser,
    restoreUser,
    promoteToAdmin,
    disableService,
    restoreService,
    submitReportReview,
    saveSettings,
    clearEmailComposer,
    sendCustomEmail,
    openCategoryModal,
    saveCategory,
    deleteCategory
  };
})();

window.Admin = Admin;

document.addEventListener("DOMContentLoaded", () => {
  Admin.init();
});
