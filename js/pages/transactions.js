// Initialize Icons
      Edel.initIcons();

      // Safe area padding for mobile
      Edel.applySafeArea();

      // View Toggle Logic
      function setView(viewType) {
        const viewCustomer = document.getElementById("view-customer");
        const viewProvider = document.getElementById("view-provider");
        const btnCustomer = document.getElementById("btn-view-customer");
        const btnProvider = document.getElementById("btn-view-provider");
        const sidebarRole = document.getElementById("sidebar-role");

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
        }
      }

      // Modal Logic
      const receiptOverlay = document.getElementById("receipt-modal-overlay");
      const receiptContent = document.getElementById("receipt-content");

      function openReceipt(txId) {
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
