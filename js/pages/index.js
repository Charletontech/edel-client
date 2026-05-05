// Initialize Lucide Icons
      Edel.initIcons();

      // Navbar Scroll Effect
      const navbar = document.getElementById("navbar");
      window.addEventListener("scroll", () => {
        if (window.scrollY > 50) {
          navbar.classList.add("bg-[#030816]/90", "py-2", "border-white/10");
          navbar.classList.remove("py-4", "border-white/5");
        } else {
          navbar.classList.remove("bg-[#030816]/90", "py-2", "border-white/10");
          navbar.classList.add("py-4", "border-white/5");
        }
      });

      // Mobile Menu Toggle
      const btn = document.getElementById("mobile-menu-btn");
      const menu = document.getElementById("mobile-menu");

      btn.addEventListener("click", () => {
        menu.classList.toggle("hidden");
      });

      // Scroll Reveal Animation
      const revealElements = document.querySelectorAll(".reveal");
      const revealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("active");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -50px 0px" },
      );

      revealElements.forEach((el) => revealObserver.observe(el));

      // Futuristic Interactivity: Magnetic Buttons
      const magneticButtons = document.querySelectorAll(".magnetic-button");
      magneticButtons.forEach((btn) => {
        btn.addEventListener("mousemove", (e) => {
          const rect = btn.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px) scale(1.02)`;
        });
        btn.addEventListener("mouseleave", () => {
          btn.style.transform = `translate(0px, 0px) scale(1)`;
        });
      });

      // Parallax Effect for Hero Widgets
      window.addEventListener("mousemove", (e) => {
        const x = (window.innerWidth / 2 - e.pageX) / 50;
        const y = (window.innerHeight / 2 - e.pageY) / 50;
        const widgets = document.querySelectorAll(".animate-float");
        widgets.forEach((widget) => {
          widget.style.transform = `translate(${x}px, ${y}px)`;
        });
      });

      // Interactive App UI Switcher
      function switchTab(tabName) {
        // Hide all screens
        const screens = document.querySelectorAll(".app-screen");
        screens.forEach((screen) => {
          screen.classList.add("opacity-0", "pointer-events-none");
          screen.classList.remove("opacity-100", "z-10");
        });

        // Reset all buttons
        const buttons = ["btn-discovery", "btn-activity", "btn-transactions"];
        buttons.forEach((id) => {
          const btn = document.getElementById(id);
          btn.classList.remove(
            "border-brand-accent",
            "bg-white/5",
            "backdrop-blur-md",
          );
          btn.classList.add("border-transparent", "opacity-60");

          // Reset icon color
          const icon = btn.querySelector("i");
          icon.classList.remove("text-brand-accent");
          icon.classList.add("text-slate-300");
        });

        // Show selected screen
        const targetScreen = document.getElementById(`screen-${tabName}`);
        targetScreen.classList.remove("opacity-0", "pointer-events-none");
        targetScreen.classList.add("opacity-100", "z-10");

        // Highlight selected button
        const targetBtn = document.getElementById(`btn-${tabName}`);
        targetBtn.classList.remove("border-transparent", "opacity-60");
        targetBtn.classList.add(
          "border-brand-accent",
          "bg-white/5",
          "backdrop-blur-md",
        );

        // Highlight icon
        const targetIcon = targetBtn.querySelector("i");
        targetIcon.classList.remove("text-slate-300");
        targetIcon.classList.add("text-brand-accent");
      }
