
function getAuthOptions() {
  return {
    headers: EdelModules.auth.getAuthHeaders()
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function previewNewImage(input) {
  const file = input.files && input.files[0];
  const previewImg = document.getElementById("preview-image");
  const previewPlaceholder = document.getElementById("preview-placeholder");
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      if (previewImg) {
        previewImg.src = e.target.result;
        previewImg.classList.remove("hidden");
      }
      if (previewPlaceholder) {
        previewPlaceholder.classList.add("hidden");
      }
    };
    reader.readAsDataURL(file);
  }
}
window.previewNewImage = previewNewImage;
window.escapeHtml = escapeHtml;
window.formatCurrency = formatCurrency;

// --- Businesses & Items Logic ---
const ProfileBusinesses = {
  businesses: [],
  categories: [],
  
  async loadCategories() {
    try {
      const cats = await EdelModules.api.get("/api/services/categories", {
        headers: EdelModules.auth.getAuthHeaders()
      });
      this.categories = Array.isArray(cats) ? cats : (cats?.data || []);
      window.allAppCategories = this.categories;
    } catch (e) {
      console.error("Failed to load categories", e);
    }
  },
  
  async updateCategoryDropdown() {
    const typeRadio = document.querySelector('input[name="bus-type"]:checked');
    const type = typeRadio ? typeRadio.value : 'Service';
    const select = document.getElementById('bus-category-input');
    if (!select) return;
    
    if (!this.categories || this.categories.length === 0) {
      await this.loadCategories();
    }

    select.innerHTML = '<option value="" disabled selected>Select a category...</option>';
    
    const catsToUse = (this.categories && this.categories.length > 0) ? this.categories : (window.allAppCategories || []);
    
    const filteredCats = catsToUse.filter(c => {
      if (!c.type) return true;
      return c.type.toLowerCase() === type.toLowerCase();
    });

    const finalCats = filteredCats.length > 0 ? filteredCats : catsToUse;

    finalCats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = c.name.charAt(0).toUpperCase() + c.name.slice(1);
      select.appendChild(opt);
    });
  },
  
  async loadBusinesses() {
    try {
      const data = await EdelModules.api.get("/api/businesses", getAuthOptions());
      this.businesses = Array.isArray(data) ? data : [];
      this.render();
    } catch (error) {
      console.error("Error loading businesses:", error);
    }
  },
  
  async saveBusiness() {
    const nameInput = document.getElementById('bus-name-input');
    const name = nameInput ? nameInput.value.trim() : '';
    const typeRadio = document.querySelector('input[name="bus-type"]:checked');
    const type = typeRadio ? typeRadio.value : 'Service';
    const categorySelect = document.getElementById('bus-category-input');
    const category = categorySelect ? categorySelect.value : '';
    
    if(!name || !category) {
      return Ui.toast("error", "Validation Error", "Please provide a business name and select a category.");
    }
    
    const btn = document.getElementById('btn-save-business');
    const ogHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Creating...';
      btn.disabled = true;
    }
    
    try {
      await EdelModules.api.post("/api/businesses", { name, businessType: type, category }, getAuthOptions());
      Ui.toast("success", "Business Created", `"${name}" has been created! You can now add items under it.`);
      closeModals();
      if (nameInput) nameInput.value = '';
      await this.loadBusinesses();
    } catch (err) {
      Ui.toast("error", "Error", err.message || "Failed to create business");
    } finally {
      if (btn) {
        btn.innerHTML = ogHtml;
        btn.disabled = false;
      }
      Edel.initIcons();
    }
  },
  
  confirmDeleteBusiness(id, name) {
    if(confirm(`WARNING: Are you sure you want to delete "${name || 'this business'}"?\n\nALL products and services associated with this business will be PERMANENTLY deleted. This action cannot be undone.`)) {
      this.deleteBusiness(id);
    }
  },
  
  async deleteBusiness(id) {
    try {
      await EdelModules.api.delete(`/api/businesses/${id}`, getAuthOptions());
      Ui.toast("success", "Business Deleted", "The business and its associated items have been removed.");
      await this.loadBusinesses();
    } catch (e) {
      Ui.toast("error", "Delete Failed", e.message || "Could not delete business");
    }
  },
  
  openAddItem(businessId) {
    const bus = this.businesses.find(b => String(b.id) === String(businessId));
    const busType = bus?.businessType || 'Service';
    const busName = bus?.name || 'Business';

    const itemBusinessIdInput = document.getElementById('item-business-id-input');
    const serviceIdInput = document.getElementById('service-id-input');
    const titleInput = document.getElementById('new-title');
    const priceInput = document.getElementById('new-price');
    const descInput = document.getElementById('new-desc');
    const imageInput = document.getElementById('new-image');
    const previewImg = document.getElementById('preview-image');
    const previewPlaceholder = document.getElementById('preview-placeholder');
    const modalTitle = document.getElementById('modal-add-service-title');
    const saveBtn = document.getElementById('btn-save-service');

    if (itemBusinessIdInput) itemBusinessIdInput.value = businessId;
    if (serviceIdInput) serviceIdInput.value = '';
    if (titleInput) titleInput.value = '';
    if (priceInput) priceInput.value = '';
    if (descInput) descInput.value = '';
    if (imageInput) imageInput.value = '';
    if (previewImg) {
      previewImg.src = '';
      previewImg.classList.add('hidden');
    }
    if (previewPlaceholder) previewPlaceholder.classList.remove('hidden');

    if (modalTitle) {
      modalTitle.textContent = `Add ${busType} to "${busName}"`;
    }
    if (saveBtn) {
      saveBtn.innerHTML = `Add ${busType} <i data-lucide="check" class="w-5 h-5"></i>`;
      saveBtn.setAttribute('onclick', 'saveNewService()');
    }

    openModal('modal-add-service');
    Edel.initIcons();
  },

  openEditItem(businessId, itemId) {
    const bus = this.businesses.find(b => String(b.id) === String(businessId));
    const item = bus?.items?.find(i => String(i.id) === String(itemId));
    if (!bus || !item) {
      return Ui.toast("error", "Error", "Could not find item details to edit.");
    }

    const itemBusinessIdInput = document.getElementById('item-business-id-input');
    const serviceIdInput = document.getElementById('service-id-input');
    const titleInput = document.getElementById('new-title');
    const priceInput = document.getElementById('new-price');
    const descInput = document.getElementById('new-desc');
    const imageInput = document.getElementById('new-image');
    const previewImg = document.getElementById('preview-image');
    const previewPlaceholder = document.getElementById('preview-placeholder');
    const modalTitle = document.getElementById('modal-add-service-title');
    const saveBtn = document.getElementById('btn-save-service');

    if (itemBusinessIdInput) itemBusinessIdInput.value = businessId;
    if (serviceIdInput) serviceIdInput.value = itemId;
    if (titleInput) titleInput.value = item.title || '';
    if (priceInput) priceInput.value = item.basePrice || '';
    if (descInput) descInput.value = item.description || '';
    if (imageInput) imageInput.value = '';

    if (item.businessPhoto && previewImg && previewPlaceholder) {
      previewImg.src = EdelModules.api.buildUrl(item.businessPhoto);
      previewImg.classList.remove('hidden');
      previewPlaceholder.classList.add('hidden');
    } else if (previewImg && previewPlaceholder) {
      previewImg.src = '';
      previewImg.classList.add('hidden');
      previewPlaceholder.classList.remove('hidden');
    }

    if (modalTitle) {
      modalTitle.textContent = `Edit ${bus.businessType}: "${item.title}"`;
    }
    if (saveBtn) {
      saveBtn.innerHTML = `Save Changes <i data-lucide="check" class="w-5 h-5"></i>`;
      saveBtn.setAttribute('onclick', 'saveNewService()');
    }

    openModal('modal-add-service');
    Edel.initIcons();
  },
  
  render() {
    const container = document.getElementById('businesses-container');
    const limitText = document.getElementById('business-limit-text');
    const btnAdd = document.getElementById('btn-add-business');
    if (!container) return;
    
    const count = this.businesses.length;
    if (count >= 3) {
      if (btnAdd) btnAdd.style.display = 'none';
      if (limitText) limitText.innerHTML = '<span class="text-amber-600 font-bold flex items-center gap-1"><i data-lucide="info" class="w-3.5 h-3.5"></i> Maximum of 3 businesses reached</span>';
    } else {
      if (btnAdd) btnAdd.style.display = 'flex';
      if (limitText) limitText.innerHTML = `You can manage up to 3 businesses <span class="font-bold text-brand-navy">(${3 - count} slot${3 - count === 1 ? '' : 's'} available)</span>`;
    }
    
    if (count === 0) {
      container.innerHTML = `
        <div class="text-center py-12 px-6 bg-slate-50/60 rounded-3xl border-2 border-dashed border-slate-200">
          <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 mx-auto mb-4 text-brand-navy">
            <i data-lucide="briefcase" class="w-8 h-8 text-brand-accent"></i>
          </div>
          <h4 class="font-extrabold text-brand-navy text-lg mb-1.5">No Businesses Created Yet</h4>
          <p class="text-slate-500 text-xs sm:text-sm max-w-md mx-auto mb-5 leading-relaxed">
            Create your business profile to start uploading products or services for discovery by customers.
          </p>
          <button onclick="openModal('modal-add-business')" class="inline-flex items-center gap-2 px-6 py-3 bg-brand-navy hover:bg-brand-blue text-brand-accent rounded-2xl font-extrabold text-sm shadow-md shadow-brand-navy/10 transition-all active:scale-95 cursor-pointer">
            <i data-lucide="plus" class="w-4 h-4"></i> Create Your First Business
          </button>
        </div>
      `;
      Edel.initIcons();
      return;
    }
    
    let html = '';
    this.businesses.forEach(bus => {
      const items = bus.items || [];
      const isProduct = bus.businessType === 'Product';
      const badgeColor = isProduct 
        ? 'bg-blue-50 text-blue-700 border border-blue-200/60' 
        : 'bg-purple-50 text-purple-700 border border-purple-200/60';
      const iconBg = isProduct
        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
        : 'bg-brand-navy text-brand-accent shadow-sm shadow-brand-navy/20';
      const iconType = isProduct ? 'box' : 'sparkles';
      
      html += `
        <div class="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
          <!-- Business Card Header -->
          <div class="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
            <div class="flex gap-3.5 sm:gap-4 items-center">
              <div class="w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center shrink-0">
                <i data-lucide="${iconType}" class="w-6 h-6"></i>
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <h4 class="font-extrabold text-brand-navy text-lg tracking-tight">${escapeHtml(bus.name)}</h4>
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeColor} uppercase tracking-wider">
                    ${bus.businessType}
                  </span>
                </div>
                <div class="flex items-center gap-2 mt-1">
                  <span class="inline-flex items-center gap-1 text-xs text-slate-500 font-semibold bg-white px-2.5 py-0.5 rounded-lg border border-slate-200/60 capitalize">
                    <i data-lucide="tag" class="w-3 h-3 text-brand-accent"></i> ${escapeHtml(bus.category)}
                  </span>
                  <span class="text-xs text-slate-400 font-medium">• ${items.length} ${items.length === 1 ? (isProduct ? 'product' : 'service') : (isProduct ? 'products' : 'services')}</span>
                </div>
              </div>
            </div>
            
            <div class="flex items-center gap-2 self-end sm:self-center">
              <button 
                onclick="ProfileBusinesses.openAddItem('${bus.id}')" 
                class="px-4 py-2 bg-brand-navy hover:bg-brand-blue text-brand-accent rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add ${bus.businessType}
              </button>
              <button 
                onclick="ProfileBusinesses.confirmDeleteBusiness('${bus.id}', '${escapeHtml(bus.name)}')" 
                class="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2.5 rounded-xl border border-transparent hover:border-red-100 transition-all cursor-pointer" 
                title="Delete Business"
              >
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
          
          <!-- Items List / Grid -->
          <div class="p-5 sm:p-6">
            ${items.length === 0 ? `
              <div class="py-8 px-4 rounded-2xl bg-slate-50/70 border border-dashed border-slate-200 text-center">
                <div class="w-10 h-10 rounded-xl bg-white shadow-xs border border-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
                  <i data-lucide="${isProduct ? 'package-plus' : 'sparkles'}" class="w-5 h-5"></i>
                </div>
                <p class="text-xs font-bold text-brand-navy mb-1">No ${isProduct ? 'products' : 'services'} added yet</p>
                <p class="text-[11px] text-slate-400 max-w-xs mx-auto mb-3.5">Add items under this business so customers can discover and request them.</p>
                <button onclick="ProfileBusinesses.openAddItem('${bus.id}')" class="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-navy hover:bg-brand-blue text-brand-accent rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add First ${bus.businessType}
                </button>
              </div>
            ` : `
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                ${items.map(item => `
                  <div class="flex flex-col p-3.5 bg-slate-50/60 rounded-2xl border border-slate-100 hover:border-brand-accent/40 hover:bg-white hover:shadow-md transition-all duration-200 group">
                    <div class="relative w-full h-36 rounded-xl overflow-hidden bg-slate-200 mb-3 shrink-0">
                      <img 
                        src="${EdelModules.api.buildUrl(item.businessPhoto)}" 
                        alt="${escapeHtml(item.title)}"
                        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        onerror="this.src='/assets/images/placeholder.png'" 
                      />
                      <span class="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-brand-navy/90 backdrop-blur-sm text-brand-accent font-extrabold text-xs shadow-sm">
                        ${formatCurrency(item.basePrice)}
                      </span>
                    </div>
                    <!-- 3-Dot Menu Button floating on top-right of photo -->
                    <div class="absolute top-2 right-2 item-menu-container z-20">
                      <button 
                        type="button" 
                        onclick="toggleItemMenu(this, event)" 
                        class="w-7 h-7 rounded-full bg-white/90 backdrop-blur-md shadow-md border border-white/80 text-slate-700 hover:text-brand-navy hover:bg-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95" 
                        title="Options"
                      >
                        <i data-lucide="more-vertical" class="w-4 h-4 pointer-events-none"></i>
                      </button>
                      
                      <!-- 3-Dot Dropdown Menu -->
                      <div class="item-dropdown-menu absolute right-0 top-full mt-1 w-36 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 hidden z-30">
                        <button 
                          type="button" 
                          onclick="ProfileBusinesses.openEditItem('${bus.id}', '${item.id}'); closeAllItemMenus();" 
                          class="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-brand-navy hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <i data-lucide="edit-3" class="w-3.5 h-3.5 text-blue-600"></i> Edit ${isProduct ? 'Product' : 'Service'}
                        </button>
                        <button 
                          type="button" 
                          onclick="deleteService('${item.id}'); closeAllItemMenus();" 
                          class="w-full text-left px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer transition-colors border-t border-slate-100"
                        >
                          <i data-lucide="trash-2" class="w-3.5 h-3.5 text-red-500"></i> Delete
                        </button>
                      </div>
                    </div>

                    <div class="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h5 class="font-bold text-brand-navy text-sm leading-snug truncate" title="${escapeHtml(item.title)}">
                          ${escapeHtml(item.title)}
                        </h5>
                        <p class="text-xs text-slate-500 font-medium line-clamp-2 mt-1 leading-relaxed">
                          ${escapeHtml(item.description || 'No description provided')}
                        </p>
                      </div>
                      <div class="flex items-center justify-between pt-3 mt-3 border-t border-slate-200/60">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          ${isProduct ? 'Product' : 'Service'}
                        </span>
                        <div class="flex items-center gap-1">
                          <button 
                            type="button" 
                            onclick="ProfileBusinesses.openEditItem('${bus.id}', '${item.id}')" 
                            class="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors cursor-pointer" 
                            title="Edit ${isProduct ? 'product' : 'service'}"
                          >
                            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                          </button>
                          <button 
                            type="button" 
                            onclick="deleteService('${item.id}')" 
                            class="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer" 
                            title="Delete ${isProduct ? 'product' : 'service'}"
                          >
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
    Edel.initIcons();
  }
};

window.ProfileBusinesses = ProfileBusinesses;
ProfileBusinesses.loadCategories();
ProfileBusinesses.loadBusinesses();

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
  const isProviderVerified = !!user?.hasPaidAccessFee && sessionRole === "provider";
  const isCustomerVerified = (!!user?.faceVerified || !!user?.facePhoto) && sessionRole === "customer";

  profileElements.badge.classList.toggle("hidden", !isProviderVerified);
  if (profileElements.rookieBadge) {
    profileElements.rookieBadge.classList.toggle("hidden", !isCustomerVerified);
  }
}

const profileElements = {
  name: document.getElementById("profile-name"),
  roleTag: document.getElementById("profile-role-tag"),
  rating: document.getElementById("profile-rating"),
  avatar: document.getElementById("profile-avatar"),
  badge: document.getElementById("profile-badge-container"),
  rookieBadge: document.getElementById("profile-rookie-badge-container"),
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

function hydrateReferralSection(user) {
  const ungeneratedView = document.getElementById("referral-ungenerated-view");
  const generatedView = document.getElementById("referral-generated-view");
  const linkInput = document.getElementById("referral-link-input");
  const countEl = document.getElementById("referrals-count");

  if (!ungeneratedView || !generatedView) return;

  if (user?.referralCode) {
    ungeneratedView.classList.add("hidden");
    generatedView.classList.remove("hidden");

    const origin = window.location.origin;
    const fullLink = user.referralLink || `${origin}/auth/?ref=${encodeURIComponent(user.referralCode)}`;

    if (linkInput) linkInput.value = fullLink;
    if (countEl) countEl.innerText = user.referralCount || 0;
  } else {
    ungeneratedView.classList.remove("hidden");
    generatedView.classList.add("hidden");
  }
}

window.generateReferralLink = async function () {
  const btn = document.getElementById("btn-generate-referral");
  const originalHtml = btn ? btn.innerHTML : "";

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin text-brand-accent"></i> Generating...`;
    Edel.initIcons();
  }

  try {
    const res = await EdelModules.api.post(
      "/api/generate-referral",
      {},
      {
        headers: EdelModules.auth.getAuthHeaders(),
        silent: true,
      }
    );

    const currentUser = EdelModules.auth.getUser() || {};
    const updatedUser = {
      ...currentUser,
      referralCode: res.referralCode,
      referralLink: res.referralLink,
      referralCount: res.referralCount || 0,
    };
    EdelModules.auth.setUser(updatedUser);

    hydrateReferralSection(updatedUser);
    Ui.toast("success", "Referral Link Created", "Your referral link is ready to share!");
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
      Edel.initIcons();
    }
    Ui.toast("error", "Generation Failed", err.message || "Failed to generate referral link");
  }
};

window.copyReferralLink = function () {
  const input = document.getElementById("referral-link-input");
  const btnText = document.getElementById("copy-btn-text");

  if (!input || !input.value) return;

  navigator.clipboard.writeText(input.value)
    .then(() => {
      if (btnText) btnText.textContent = "Copied!";
      Ui.toast("success", "Copied to Clipboard", "Referral link copied.");
      setTimeout(() => {
        if (btnText) btnText.textContent = "Copy";
      }, 2500);
    })
    .catch(() => {
      input.select();
      document.execCommand("copy");
      if (btnText) btnText.textContent = "Copied!";
      Ui.toast("success", "Copied to Clipboard", "Referral link copied.");
      setTimeout(() => {
        if (btnText) btnText.textContent = "Copy";
      }, 2500);
    });
};

window.shareReferral = function (platform) {
  const input = document.getElementById("referral-link-input");
  const link = input?.value || window.location.href;
  const shareText = encodeURIComponent(`Join me on E-del! Use my referral link to register: ${link}`);

  if (platform === "whatsapp") {
    window.open(`https://api.whatsapp.com/send?text=${shareText}`, "_blank");
  } else if (platform === "twitter") {
    window.open(`https://twitter.com/intent/tweet?text=${shareText}`, "_blank");
  }
};

function getRatingHtml(ratingVal, role) {
  const defaultVal = 50;
  const val = ratingVal !== undefined && ratingVal !== null ? Math.round(Number(ratingVal)) : defaultVal;
  let icon = "minus";
  let iconClass = "text-slate-400";
  if (val >= 80) {
    icon = "trending-up";
    iconClass = "text-green-500";
  } else if (val < 50) {
    icon = "trending-down";
    iconClass = "text-red-500";
  }
  return `${val}% <i data-lucide="${icon}" class="w-4 h-4 ${iconClass}"></i>`;
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
  profileElements.rating.innerHTML = getRatingHtml(user.rating, sessionRole);

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
  hydrateReferralSection(user);

  const switchButton = document.getElementById("btn-switch-account");
  if (switchButton) {
    switchButton.classList.remove("hidden");
    if (user.role === "both") {
      switchButton.title = "Switch Account";
    } else if (user.role === "customer") {
      switchButton.title = "Become a Provider";
    } else if (user.role === "provider") {
      switchButton.title = "Add Customer Account";
    }
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
  if (!user) return;
  if (user.role === "both") {
    openModal("modal-switch-account");
  } else if (user.role === "customer") {
    setView("provider");
  } else if (user.role === "provider") {
    setView("customer");
  }
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
        profileRating.innerHTML = getRatingHtml(updatedUser.rating, "customer");
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
        profileRating.innerHTML = getRatingHtml(updatedUser.rating, "provider");
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
      profileRating.innerHTML = getRatingHtml(currentUser.rating, "customer");
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
      profileRating.innerHTML = getRatingHtml(currentUser.rating, "provider");
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
  const serviceCategory = document.getElementById("upgrade-category")?.value;
  const serviceTitle = document.getElementById("upgrade-title")?.value;
  const basePrice = document.getElementById("upgrade-price")?.value;
  const serviceDescription = document.getElementById("upgrade-desc")?.value;
  const photoInput = document.getElementById("upgrade-business-photo");

  if (!serviceCategory || !serviceTitle || !basePrice || !serviceDescription) {
    Ui.toast("warning", "Missing Fields", "Please fill all fields to upgrade.");
    return;
  }

  if (!photoInput?.files?.[0]) {
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
    const currentUser = EdelModules.auth.getUser();
    selectElement.value = currentUser?.availabilityStatus || "available";
  }
}

function updateStatusUI(status) {
  const iconContainer = document.getElementById("status-icon-container");
  const description = document.getElementById("status-description");
  const selectElement = document.getElementById("provider-status");

  if (!iconContainer || !description || !selectElement) return;

  selectElement.classList.remove(
    "status-available",
    "status-busy",
    "status-away",
    "status-unavailable",
  );

  iconContainer.className =
    "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-300 shadow-[0_2px_4px_rgba(100,116,139,0.25)]";

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
    case "away":
    case "unavailable":
      selectElement.classList.add("status-away");
      iconContainer.classList.add("bg-red-50", "text-red-600");
      iconContainer.innerHTML = '<i data-lucide="moon" class="w-6 h-6"></i>';
      description.innerText = "Away. Not accepting any requests right now.";
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
  const serviceId = document.getElementById("service-id-input")?.value;
  const businessId = document.getElementById("item-business-id-input")?.value;
  const title = document.getElementById("new-title")?.value?.trim();
  const basePrice = document.getElementById("new-price")?.value?.trim();
  const description = document.getElementById("new-desc")?.value?.trim();
  const imageInput = document.getElementById("new-image");
  const imageFile = imageInput?.files ? imageInput.files[0] : null;

  if (!title || !basePrice || !description) {
    return Ui.toast("error", "Validation Error", "Please fill in item title, price, and description");
  }

  if (!businessId) {
    return Ui.toast("error", "Error", "A business is required to add this item");
  }

  if (!serviceId && !imageFile) {
    return Ui.toast("error", "Photo Required", "Please upload a photo for your item");
  }

  const formData = new FormData();
  formData.append("businessId", businessId);
  formData.append("title", title);
  formData.append("basePrice", basePrice);
  formData.append("description", description);
  if (imageFile) {
    formData.append("businessPhoto", imageFile);
  }

  const btn = document.getElementById("btn-save-service");
  const ogHtml = btn ? btn.innerHTML : "";
  if (btn) {
    btn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Saving...';
    btn.disabled = true;
  }

  try {
    if (serviceId) {
      await EdelModules.api.put(`/api/services/${serviceId}`, formData, {
        headers: EdelModules.auth.getAuthHeaders()
      });
      Ui.toast("success", "Item Updated", "Your item has been updated successfully.");
    } else {
      await EdelModules.api.post("/api/services", formData, {
        headers: EdelModules.auth.getAuthHeaders()
      });
      Ui.toast("success", "Item Added", "New item listed under your business!");
    }

    closeModals();
    await ProfileBusinesses.loadBusinesses();
  } catch (error) {
    Ui.toast("error", "Save Failed", error.message || "Failed to save item");
  } finally {
    if (btn) {
      btn.innerHTML = ogHtml;
      btn.disabled = false;
    }
    Edel.initIcons();
  }
}

async function deleteService(id) {
  if (!confirm("Are you sure you want to delete this item?")) return;

  try {
    await EdelModules.api.delete('/api/services/' + id, {
      headers: EdelModules.auth.getAuthHeaders()
    });

    Ui.toast("success", "Item Deleted", "The item has been removed.");
    await ProfileBusinesses.loadBusinesses();
  } catch (error) {
    Ui.toast("error", "Delete Failed", error.message || "Could not delete item");
  }
}


// 3-Dot Item Menu Dropdown Helpers
window.toggleItemMenu = function(button, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const container = button.closest('.item-menu-container');
  const menu = container ? container.querySelector('.item-dropdown-menu') : null;
  if (!menu) return;
  
  const isHidden = menu.classList.contains('hidden');
  
  // Close all other item menus first
  window.closeAllItemMenus();
  
  if (isHidden) {
    menu.classList.remove('hidden');
  }
};

window.closeAllItemMenus = function() {
  document.querySelectorAll('.item-dropdown-menu').forEach(m => {
    m.classList.add('hidden');
  });
};

document.addEventListener('click', (e) => {
  if (!e.target.closest('.item-menu-container')) {
    window.closeAllItemMenus();
  }
});

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
  const service = user?.services?.find((s) => s.id === id);
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
}

function openModal(modalId) {
  const overlay = document.getElementById("modal-overlay");
  const modal = document.getElementById(modalId);

  if (modalId === 'modal-add-business') {
    ProfileBusinesses.updateCategoryDropdown();
  }

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

document.getElementById("modal-overlay")?.addEventListener("click", function (e) {
  if (e.target === this) {
    closeModals();
  }
});

window.updateProviderStatus = updateProviderStatus;
window.updateStatusUI = updateStatusUI;
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

// ─── Update My Location (Profile Page) ────────────────────────────────────────
/**
 * Triggered by the "Update My Location" button on the profile page.
 * Runs the full getLocation() flow (GPS → IP → manual) with appropriate notifications.
 */
async function saveProfileLocation(label, lat, lng) {
  try {
    await EdelModules.api.put(
      '/api/location',
      { locationLabel: label, latitude: lat, longitude: lng },
      { headers: EdelModules.auth.getAuthHeaders(), silent: true },
    );

    // Update local user data
    const user = EdelModules.auth.getUser() || {};
    user.locationLabel = label;
    user.latitude = lat;
    user.longitude = lng;
    EdelModules.auth.setUser(user);

    // Update the location label on screen
    const locationElement = document.getElementById('profile-location');
    if (locationElement) locationElement.innerText = label;

    Ui.toast('success', 'Location Updated', `✅ Location updated to ${label}`);
    return true;
  } catch (err) {
    Ui.toast('error', 'Update Failed', '❌ Could not save location. Please try again.');
    return false;
  }
}

function openManualLocationModal() {
  openModal('modal-manual-location');
  const manualInput = document.getElementById('profile-manual-location-input');
  const manualStatus = document.getElementById('profile-manual-location-status');
  if (manualInput) manualInput.value = '';
  if (manualStatus) manualStatus.innerHTML = '';
}

async function updateMyLocation() {
  // Directly prompt manual location modal (skipping GPS auto-detect per user request)
  openManualLocationModal();
}
function initProfileManualLocation() {
  const manualInput = document.getElementById('profile-manual-location-input');
  const manualStatus = document.getElementById('profile-manual-location-status');
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
          const saved = await saveProfileLocation(loc.city || loc.label, loc.lat, loc.lng);
          if (saved) {
            closeModals();
          }
        } else {
          updateStatus('<span class="flex items-center gap-1 text-amber-600"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Try a different search term.</span>');
          manualInput.value = '';
        }
      } catch (err) {
        updateStatus('<span class="flex items-center gap-1 text-red-500"><i data-lucide="wifi-off" class="w-3.5 h-3.5"></i> Search failed. Check your connection.</span>');
      }
    }, 1200);
  });
}

window.updateMyLocation = updateMyLocation;
document.getElementById('btn-update-location')?.addEventListener('click', updateMyLocation);
initProfileManualLocation();

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
