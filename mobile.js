const q = (selector, root = document) => root.querySelector(selector);
const qa = (selector, root = document) => [...root.querySelectorAll(selector)];

function scrollToAndFocus(element) {
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => element.focus?.({ preventScroll: true }), 320);
}

function bindMobileDock() {
  const dock = q(".mobile-dock");
  if (!dock) return;

  dock.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mobile-action]");
    if (!button) return;

    const action = button.dataset.mobileAction;
    if (action === "search") {
      scrollToAndFocus(q("#foodSearch"));
    } else if (action === "summary") {
      q("#summarySection")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (action === "targets") {
      q("#targetsBtn2")?.click();
    }
  });
}

function enhanceQuantityControls() {
  qa(".mobile-cards .card-qty").forEach((row) => {
    if (row.dataset.enhanced === "true") return;
    const input = q('input[data-action="qty"]', row);
    if (!input) return;

    row.dataset.enhanced = "true";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.className = "qty-step";
    minus.textContent = "−10";
    minus.setAttribute("aria-label", "تقليل الكمية 10 جرام");

    const plus = document.createElement("button");
    plus.type = "button";
    plus.className = "qty-step";
    plus.textContent = "+10";
    plus.setAttribute("aria-label", "زيادة الكمية 10 جرام");

    minus.addEventListener("click", () => {
      input.value = Math.max(0, (Number(input.value) || 0) - 10);
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    plus.addEventListener("click", () => {
      input.value = Math.min(100000, (Number(input.value) || 0) + 10);
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    row.append(minus, plus);
  });
}

function watchMobileCards() {
  const cards = q("#mobileCards");
  if (!cards) return;
  enhanceQuantityControls();
  const observer = new MutationObserver(enhanceQuantityControls);
  observer.observe(cards, { childList: true, subtree: true });
}

function improveMobileViewport() {
  const search = q("#foodSearch");
  search?.addEventListener("focus", () => {
    if (window.innerWidth <= 700) {
      setTimeout(() => search.scrollIntoView({ behavior: "smooth", block: "center" }), 180);
    }
  });
}

bindMobileDock();
watchMobileCards();
improveMobileViewport();
