// Initialize Icons
Edel.initIcons();

// Safe area padding for mobile
Edel.applySafeArea();

if (!EdelModules.auth.requireAuth()) {
  throw new Error("Authentication required");
}

let billingState = {
  status: null,
  transactions: [],
  currentView: "customer"
};

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

async function loadBillingData() {
  try {
    const user = EdelModules.auth.getUser();
    const sessionRole = getSessionRole(user);
    if (sessionRole === 'provider' || user.role === 'admin') {
      const [statusRes, txRes] = await Promise.all([
        EdelModules.api.get('/api/billing/status', { headers: EdelModules.auth.getAuthHeaders() }),
        EdelModules.api.get('/api/billing/transactions', { headers: EdelModules.auth.getAuthHeaders() })
      ]);
      billingState.status = statusRes;
      billingState.transactions = txRes;
      renderProviderView();
      
      // If the active session is provider, automatically switch to provider view
      if (sessionRole === 'provider' || user.role === 'admin') {
          setView('provider');
      }
    } else {
        setView('customer');
    }
  } catch (error) {
    console.error("Failed to load billing data", error);
  }
}

function renderProviderView() {
  const viewProvider = document.getElementById("view-provider");
  if (!viewProvider) return;

  const { status, transactions } = billingState;
  
  let headerHtml = '';
  if (status.hasPaidAccessFee) {
    headerHtml = `
      <div class="bg-white rounded-[2rem] p-1.5 border border-slate-200 shadow-xl relative overflow-hidden mb-8 group">
        <!-- Inner ticket wrapper -->
        <div class="bg-slate-50 rounded-[1.6rem] p-6 lg:p-8 flex flex-col md:flex-row justify-between gap-8 h-full relative overflow-hidden border border-white">
          
          <!-- Decorative Background Gradient Strip -->
          <div class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-green-400 via-brand-navy to-brand-accent"></div>
          
          <!-- Abstract Background Blob -->
          <div class="absolute -right-20 -top-20 w-72 h-72 bg-green-500/5 rounded-full blur-3xl group-hover:bg-green-500/10 transition-colors duration-700 pointer-events-none"></div>

          <!-- Left Content: Progress & Status -->
          <div class="relative z-10 flex-1 flex flex-col justify-center">
            <div class="inline-flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 shadow-sm w-max mb-5">
              <i data-lucide="shield-check" class="w-3.5 h-3.5 text-green-600"></i>
              <span class="text-[10px] font-bold text-green-700 uppercase tracking-wider">Premium Status</span>
            </div>
            
            <h2 class="text-3xl lg:text-4xl font-extrabold text-brand-navy tracking-tight mb-3">
              Lifetime <span class="text-green-500 font-medium text-2xl lg:text-3xl">Unlocked</span>
            </h2>
            <p class="text-sm text-slate-500 max-w-md leading-relaxed mb-6">
              You have successfully paid the one-time platform access fee. Your account is now permanently upgraded to accept unlimited service requests.
            </p>

            <!-- Feature list -->
            <div class="flex flex-wrap gap-3">
              <div class="flex items-center gap-2 text-sm font-bold text-brand-navy bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm">
                <div class="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600"><i data-lucide="infinity" class="w-3.5 h-3.5"></i></div>
                Unlimited Orders
              </div>
              <div class="flex items-center gap-2 text-sm font-bold text-brand-navy bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm">
                <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><i data-lucide="percent" class="w-3.5 h-3.5"></i></div>
                Zero Commissions
              </div>
            </div>
          </div>

          <!-- Right Content: Premium Upgrade Box (Now active state) -->
          <div class="relative z-10 md:w-80 shrink-0 bg-white rounded-3xl p-6 shadow-soft border border-green-100 flex flex-col justify-between overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-green-50/50 rounded-bl-[100px] pointer-events-none"></div>
            <div class="relative z-10">
              <div class="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center mb-4 shadow-md shadow-green-500/20 group-hover:scale-110 transition-transform">
                <i data-lucide="check-circle-2" class="w-6 h-6"></i>
              </div>
              <h3 class="text-lg font-bold text-brand-navy mb-1">Pass Active</h3>
              <p class="text-xs text-slate-500 mb-6 leading-relaxed">No further payments required. You have full, unrestricted access to the E-del marketplace.</p>
            </div>
            <div class="w-full bg-green-50 text-green-700 font-bold py-3.5 px-4 rounded-xl border border-green-200 flex items-center justify-center gap-2 text-sm relative z-10">
              <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
              Verified Member
            </div>
          </div>
          
        </div>
      </div>
    `;
  } else if (status.requiresPayment) {
    headerHtml = `
      <div class="bg-brand-navy rounded-[2rem] p-6 lg:p-8 text-white relative overflow-hidden shadow-floating mb-8 border border-white/5">
        <div class="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div class="absolute inset-0 card-pattern opacity-10"></div>
        <div class="relative z-10 flex flex-col md:flex-row justify-between md:items-end gap-6">
          <div>
            <div class="flex items-center gap-2 text-red-400 mb-4 font-bold">
              <i data-lucide="lock" class="w-4 h-4"></i>
              <span class="text-sm font-bold uppercase tracking-wider">Access Locked</span>
            </div>
            <h2 class="text-3xl lg:text-4xl font-extrabold tracking-tight mb-2">Payment Required</h2>
            <p class="text-sm text-slate-400 max-w-sm leading-relaxed">You have completed ${status.jobsCompleted} free orders. Please pay the one-time fee to unlock unlimited orders.</p>
          </div>
          <div class="flex w-full md:w-auto">
            <button onclick="payAccessFee()" class="w-full bg-brand-accent text-brand-navy hover:bg-white font-bold py-4 px-8 rounded-2xl shadow-glow transition-all active:scale-95 flex items-center justify-center gap-3">
              <i data-lucide="credit-card" class="w-5 h-5"></i>
              Pay ₦${status.accessFeeAmount.toLocaleString()} Now
            </button>
          </div>
        </div>
      </div>
    `;
  } else {
    const remaining = status.freeOrdersLimit - status.jobsCompleted;
    
    // Create a dynamic progress indicator
    let progressVisual = '';
    if (status.freeOrdersLimit <= 10) {
      const slots = Array.from({ length: status.freeOrdersLimit }).map((_, i) => {
        const isCompleted = i < status.jobsCompleted;
        if (isCompleted) {
          return `<div class="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-brand-navy flex items-center justify-center text-brand-accent shadow-inner border-2 border-brand-navy transform transition-transform hover:scale-110"><i data-lucide="check" class="w-5 h-5 lg:w-6 lg:h-6"></i></div>`;
        } else {
          return `<div class="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white flex items-center justify-center text-slate-300 border-2 border-slate-200 border-dashed shadow-sm"><span class="text-sm font-bold">${i + 1}</span></div>`;
        }
      }).join('');
      
      progressVisual = `
        <div class="flex flex-wrap items-center gap-3 mt-6">
          ${slots}
        </div>
      `;
    } else {
      const progressPercent = (status.jobsCompleted / status.freeOrdersLimit) * 100;
      progressVisual = `
        <div class="mt-6 max-w-sm">
           <div class="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
             <div class="h-full bg-brand-navy rounded-full transition-all duration-1000 relative overflow-hidden" style="width: ${progressPercent}%">
                <div class="absolute inset-0 bg-white/20 w-full h-full transform -skew-x-12 animate-[pulse_2s_infinite]"></div>
             </div>
           </div>
           <div class="flex justify-between text-xs text-slate-500 font-bold mt-2 uppercase tracking-wider">
             <span>${status.jobsCompleted} Completed</span>
             <span>${status.freeOrdersLimit} Limit</span>
           </div>
        </div>
      `;
    }

    headerHtml = `
      <div class="bg-white rounded-[2rem] p-1.5 border border-slate-200 shadow-xl relative overflow-hidden mb-8 group">
        <!-- Inner ticket wrapper -->
        <div class="bg-slate-50 rounded-[1.6rem] p-6 lg:p-8 flex flex-col md:flex-row justify-between gap-8 h-full relative overflow-hidden border border-white">
          
          <!-- Decorative Background Gradient Strip -->
          <div class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-accent via-brand-navy to-brand-accent"></div>
          
          <!-- Abstract Background Blob -->
          <div class="absolute -right-20 -top-20 w-72 h-72 bg-brand-accent/5 rounded-full blur-3xl group-hover:bg-brand-accent/10 transition-colors duration-700 pointer-events-none"></div>

          <!-- Left Content: Progress & Status -->
          <div class="relative z-10 flex-1 flex flex-col justify-center">
            <div class="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm w-max mb-5">
              <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span class="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Free Trial Active</span>
            </div>
            
            <h2 class="text-3xl lg:text-4xl font-extrabold text-brand-navy tracking-tight mb-2">
              ${remaining} <span class="text-slate-400 font-medium text-2xl lg:text-3xl">Orders Left</span>
            </h2>
            <p class="text-sm text-slate-500 max-w-md leading-relaxed">
              Complete your first few orders for free to build your reputation on E-del. Earn your 5-star rating before you pay a dime.
            </p>

            ${progressVisual}
          </div>

          <!-- Right Content: Premium Upgrade Box -->
          <div class="relative z-10 md:w-80 shrink-0 bg-white rounded-3xl p-6 shadow-soft border border-slate-100 flex flex-col justify-between">
            <div>
              <div class="w-12 h-12 bg-brand-navy text-brand-accent rounded-2xl flex items-center justify-center mb-4 shadow-md rotate-3 group-hover:rotate-6 transition-transform">
                <i data-lucide="zap" class="w-6 h-6"></i>
              </div>
              <h3 class="text-lg font-bold text-brand-navy mb-1">Skip the Wait</h3>
              <p class="text-xs text-slate-500 mb-6 leading-relaxed">Unlock unlimited orders immediately and secure your lifetime provider access today.</p>
            </div>
            <button onclick="payAccessFee()" class="w-full bg-brand-navy text-white hover:bg-brand-accent hover:text-brand-navy font-bold py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 text-sm group/btn">
              Pay ₦${status.accessFeeAmount.toLocaleString()} Early
              <i data-lucide="arrow-right" class="w-4 h-4 group-hover/btn:translate-x-1 transition-transform"></i>
            </button>
          </div>
          
        </div>
      </div>
    `;
  }

  let txHtml = '';
  if (transactions.length === 0) {
    txHtml = `
      <div class="p-12 text-center flex flex-col items-center">
        <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <i data-lucide="receipt" class="w-8 h-8 text-slate-300"></i>
        </div>
        <h3 class="text-lg font-bold text-brand-navy mb-1">No Transactions Yet</h3>
        <p class="text-sm text-slate-500">Your payment history will appear here.</p>
      </div>
    `;
  } else {
    txHtml = transactions.map(tx => {
      const isSuccess = tx.status === 'success';
      const icon = isSuccess ? 'unlock' : (tx.status === 'failed' ? 'x-circle' : 'clock');
      const color = isSuccess ? 'text-brand-navy bg-brand-accent/10 border-brand-accent/20' : (tx.status === 'failed' ? 'text-red-600 bg-red-50 border-red-100' : 'text-orange-600 bg-orange-50 border-orange-100');
      const statusBadge = isSuccess 
        ? `<span class="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-md mt-1 inline-flex items-center gap-1"><i data-lucide="check" class="w-3 h-3"></i> Successful</span>`
        : `<span class="text-[10px] font-bold uppercase tracking-wider mt-1 inline-block ${tx.status === 'failed' ? 'text-red-600' : 'text-orange-600'}">${tx.status}</span>`;

      return `
        <div class="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors group" onclick="openReceipt('${tx.id}')">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors ${color} group-hover:bg-brand-accent/20">
              <i data-lucide="${icon}" class="w-5 h-5"></i>
            </div>
            <div>
              <h4 class="font-bold text-brand-navy text-sm sm:text-base">${tx.description || 'Platform Access Fee'}</h4>
              <p class="text-xs text-slate-500 mt-0.5">${new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Paid via Atlas</p>
            </div>
          </div>
          <div class="text-right">
            <p class="font-bold text-brand-navy sm:text-lg">-₦${Number(tx.amount).toLocaleString()}</p>
            ${statusBadge}
          </div>
        </div>
      `;
    }).join('');
  }

  viewProvider.innerHTML = `
    <div class="max-w-4xl mx-auto space-y-8">
      ${headerHtml}
      <div>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-brand-navy">Platform Billing History</h3>
          <span class="text-xs font-semibold text-slate-400 bg-slate-200 px-2.5 py-1 rounded-md">Powered by Atlas</span>
        </div>
        <div class="bg-white rounded-3xl border border-slate-100 shadow-soft overflow-hidden">
          ${txHtml}
        </div>
      </div>
    </div>
  `;
  Edel.initIcons();
}

async function payAccessFee() {
  try {
    const initRes = await EdelModules.api.post('/api/atlas/checkout/access-fee', {}, {
      headers: EdelModules.auth.getAuthHeaders()
    });

    if (!initRes.checkoutUrl || !initRes.sourceReference) {
      throw new Error("Could not initialize Atlas checkout.");
    }

    localStorage.setItem("edel_pending_atlas_source_reference", initRes.sourceReference);
    window.location.href = initRes.checkoutUrl;
  } catch (error) {
    Ui.toast("error", "Payment Error", error.message || "Could not initialize payment.");
  }
}

async function verifyPendingAtlasCheckout(sourceReference, { silent = false } = {}) {
  if (!sourceReference) return false;

  try {
    await EdelModules.api.get(`/api/atlas/checkout/access-fee/verify/${encodeURIComponent(sourceReference)}`, {
      headers: EdelModules.auth.getAuthHeaders(),
      silent
    });

    localStorage.removeItem("edel_pending_atlas_source_reference");

    const user = EdelModules.auth.getUser();
    if (user) {
      user.hasPaidAccessFee = true;
      EdelModules.auth.setUser(user);
    }

    if (!silent) {
      Ui.toast("success", "Payment Successful", "Thank you! Your access fee has been paid.");
    }

    await loadBillingData();
    return true;
  } catch (error) {
    if (!silent) {
      Ui.toast("info", "Payment Pending", error.message || "We could not confirm this payment yet.");
    }
    await loadBillingData();
    return false;
  }
}

async function reconcileAtlasCheckoutFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const sourceReference =
    params.get("sourceReference") ||
    params.get("source_reference") ||
    params.get("reference") ||
    localStorage.getItem("edel_pending_atlas_source_reference");

  if (!sourceReference) return;

  await verifyPendingAtlasCheckout(sourceReference, { silent: !window.location.search });

  if (window.location.search) {
    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({}, document.title, cleanUrl);
  }
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
    sidebarRole.textContent = getRoleLabel(user);
  }

  const btnCustomer = document.getElementById("btn-view-customer");
  const btnProvider = document.getElementById("btn-view-provider");
  const toggleWrapper = btnCustomer?.parentElement;
  if (toggleWrapper) {
    toggleWrapper.classList.toggle("hidden", user.role !== "admin");
  } else {
    btnCustomer?.classList.toggle("hidden", user.role !== "admin");
    btnProvider?.classList.toggle("hidden", user.role !== "admin");
  }

  const profilePhoto = EdelModules.api.buildUrl(
    user.profilePhoto || "/assets/images/avatar.jpg",
  );
  if (sidebarImg) sidebarImg.src = profilePhoto;
  if (mobileImg) mobileImg.src = profilePhoto;
}

// View Toggle Logic
function setView(viewType) {
        const viewCustomer = document.getElementById("view-customer");
        const viewProvider = document.getElementById("view-provider");
        const btnCustomer = document.getElementById("btn-view-customer");
        const btnProvider = document.getElementById("btn-view-provider");
        const sidebarRole = document.getElementById("sidebar-role");
        const currentUser = EdelModules.auth.getUser() || {};

        if (currentUser.role === "both") {
          EdelModules.auth.setSessionRole(viewType);
        }

        if (viewType === "customer") {
          btnCustomer.className =
            "flex-1 lg:flex-none px-6 py-2 rounded-lg bg-brand-navy text-brand-accent font-bold text-sm transition-all shadow-sm";
          btnProvider.className =
            "flex-1 lg:flex-none px-6 py-2 rounded-lg text-slate-500 font-bold text-sm hover:text-brand-navy transition-all";

          viewCustomer.classList.remove("hidden");
          viewCustomer.classList.add("block");
          viewProvider.classList.remove("block");
          viewProvider.classList.add("hidden");

          sidebarRole.innerText = "Customer Account";
        } else {
          btnProvider.className =
            "flex-1 lg:flex-none px-6 py-2 rounded-lg bg-brand-navy text-brand-accent font-bold text-sm transition-all shadow-sm";
          btnCustomer.className =
            "flex-1 lg:flex-none px-6 py-2 rounded-lg text-slate-500 font-bold text-sm hover:text-brand-navy transition-all";

          viewProvider.classList.remove("hidden");
          viewProvider.classList.add("block");
          viewCustomer.classList.remove("block");
          viewCustomer.classList.add("hidden");

          sidebarRole.innerText = "Provider Account";
          
          if (!billingState.status) {
            loadBillingData();
          } else {
            renderProviderView();
          }
        }
      }

      // Modal Logic
      const receiptOverlay = document.getElementById("receipt-modal-overlay");
      const receiptContent = document.getElementById("receipt-content");

      function openReceipt(txId) {
        const tx = billingState.transactions.find(t => t.id == txId);
        if (!tx) return;

        // Update Receipt Modal Content
        const modal = document.getElementById("receipt-content");
        if (modal) {
          const dateStr = new Date(tx.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
          const timeStr = new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const amountStr = Number(tx.amount).toLocaleString();
          
          modal.querySelector(".text-5xl").textContent = amountStr;
          modal.querySelector(".text-brand-navy.font-bold").innerHTML = `${dateStr}<br/><span class="text-xs text-slate-400 font-normal">${timeStr}</span>`;
          modal.querySelector(".font-mono.font-bold").textContent = tx.reference;
          modal.querySelector(".text-sm.font-bold.text-brand-navy:last-child").textContent = `₦${amountStr}`;
        }

        receiptOverlay.classList.remove("hidden");
        receiptOverlay.classList.add("flex");

        setTimeout(() => {
          receiptOverlay.classList.remove("opacity-0");
          receiptContent.classList.remove(
            "translate-y-full",
            "lg:translate-y-8",
          );
          receiptContent.classList.add("translate-y-0");
        }, 10);
      }

      function closeReceipt() {
        receiptOverlay.classList.add("opacity-0");
        receiptContent.classList.remove("translate-y-0");
        receiptContent.classList.add("translate-y-full", "lg:translate-y-8");

        setTimeout(() => {
          receiptOverlay.classList.add("hidden");
          receiptOverlay.classList.remove("flex");
        }, 300);
      }

      receiptOverlay.addEventListener("click", (e) => {
        if (e.target === receiptOverlay) {
          closeReceipt();
        }
      });

// Expose globally for onclick handlers
window.payAccessFee = payAccessFee;
window.verifyPendingAtlasCheckout = verifyPendingAtlasCheckout;
window.openReceipt = openReceipt;
window.closeReceipt = closeReceipt;
window.setView = setView;

window.addEventListener("load", () => {
  populateUserProfile();
  loadBillingData().then(() => reconcileAtlasCheckoutFromUrl());
});
