// =====================================================
// Main JavaScript - Healthcare Scheduler
// Handles navigation, mobile menu, and general UI
// =====================================================

document.addEventListener("DOMContentLoaded", function () {
  // === Mobile Menu Toggle ===
  const navbarToggle = document.querySelector(".navbar-toggle");
  const navbarMenu = document.querySelector(".navbar-menu");

  if (navbarToggle && navbarMenu) {
    navbarToggle.addEventListener("click", function () {
      navbarMenu.classList.toggle("active");

      // Animate hamburger icon
      const spans = navbarToggle.querySelectorAll("span");
      if (navbarMenu.classList.contains("active")) {
        spans[0].style.transform = "rotate(45deg) translate(5px, 5px)";
        spans[1].style.opacity = "0";
        spans[2].style.transform = "rotate(-45deg) translate(7px, -6px)";
      } else {
        spans[0].style.transform = "none";
        spans[1].style.opacity = "1";
        spans[2].style.transform = "none";
      }
    });

    // Close mobile menu when clicking a link
    const navLinks = navbarMenu.querySelectorAll("a");
    navLinks.forEach((link) => {
      link.addEventListener("click", function () {
        if (window.innerWidth <= 768) {
          navbarMenu.classList.remove("active");
          const spans = navbarToggle.querySelectorAll("span");
          spans[0].style.transform = "none";
          spans[1].style.opacity = "1";
          spans[2].style.transform = "none";
        }
      });
    });
  }

  // === Active Navigation Highlighting ===
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const navLinks = document.querySelectorAll(".navbar-menu a");

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (
      href === currentPage ||
      (currentPage === "" && href === "index.html") ||
      (currentPage === "index.html" && href === "index.html")
    ) {
      link.classList.add("active");
    }
  });

  // === Smooth Scrolling ===
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });

  // === Navbar Auto-Hide on Scroll ===
  const navbar = document.querySelector(".navbar");
  if (navbar) {
    let lastScrollTop = 0;
    let scrollThreshold = 5; // Minimum scroll distance to trigger
    
    window.addEventListener("scroll", function () {
      let currentScroll = window.pageYOffset || document.documentElement.scrollTop;
      
      // Add shadow when scrolled
      if (currentScroll > 50) {
        navbar.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
      } else {
        navbar.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.08)";
      }
      
      // Hide navbar on scroll down, show on scroll up
      if (Math.abs(currentScroll - lastScrollTop) < scrollThreshold) {
        return; // Ignore small scrolls
      }
      
      if (currentScroll > lastScrollTop && currentScroll > 100) {
        // Scrolling DOWN - hide navbar
        navbar.style.transform = "translateY(-100%)";
        navbar.style.transition = "transform 0.3s ease-in-out";
      } else {
        // Scrolling UP - show navbar
        navbar.style.transform = "translateY(0)";
        navbar.style.transition = "transform 0.3s ease-in-out";
      }
      
      lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
    });
  }

  // === Search Bar (real search functionality) ===
  const searchInput = document.querySelector(".navbar-search input");
  if (searchInput) {
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        const query = this.value.trim();
        if (query) {
          performSearch(query);
        }
      }
    });
    
    // Clear search on escape
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        clearSearch();
        this.value = "";
      }
    });
  }
});

// === Search Functions ===

// Perform content search on current page
function performSearch(query) {
  if (!query || query.length < 2) {
    alert("Please enter at least 2 characters to search");
    return;
  }

  // Clear previous search
  clearSearch();

  // Get main content areas (exclude navbar and footer)
  const contentAreas = document.querySelectorAll(
    ".section, .hero, .card-body, .card-header, h1, h2, h3, h4, p, li, td, th"
  );

  let matchCount = 0;
  const searchRegex = new RegExp(`(${escapeRegex(query)})`, "gi");

  contentAreas.forEach((element) => {
    // Skip if element contains other elements we'll search separately
    if (
      element.children.length > 0 &&
      !["TD", "TH", "LI", "P"].includes(element.tagName)
    ) {
      return;
    }

    const originalText = element.textContent;
    const innerHTML = element.innerHTML;

    // Only search in text nodes, not in HTML tags
    if (searchRegex.test(originalText)) {
      // For simple text elements
      if (element.children.length === 0) {
        const highlightedHTML = innerHTML.replace(
          searchRegex,
          '<mark class="search-highlight">$1</mark>'
        );
        element.innerHTML = highlightedHTML;
        matchCount += (originalText.match(searchRegex) || []).length;
      }
    }
  });

  // Show results
  if (matchCount > 0) {
    showSearchResults(matchCount, query);
    // Scroll to first result
    const firstMatch = document.querySelector(".search-highlight");
    if (firstMatch) {
      firstMatch.scrollIntoView({ behavior: "smooth", block: "center" });
      firstMatch.classList.add("search-highlight-active");
    }
  } else {
    alert(`No results found for "${query}"`);
  }
}

// Clear search highlights
function clearSearch() {
  // Remove all highlight marks
  const highlights = document.querySelectorAll(".search-highlight");
  highlights.forEach((mark) => {
    const parent = mark.parentNode;
    parent.replaceChild(document.createTextNode(mark.textContent), mark);
    parent.normalize(); // Merge adjacent text nodes
  });

  // Remove search results notification
  const searchNotification = document.getElementById("searchNotification");
  if (searchNotification) {
    searchNotification.remove();
  }
}

// Show search results notification
function showSearchResults(count, query) {
  // Remove existing notification
  const existing = document.getElementById("searchNotification");
  if (existing) existing.remove();

  // Create notification
  const notification = document.createElement("div");
  notification.id = "searchNotification";
  notification.className = "search-notification";
  notification.innerHTML = `
        <span>Found <strong>${count}</strong> result${
    count !== 1 ? "s" : ""
  } for "<strong>${escapeHtml(query)}</strong>"</span>
        <button onclick="clearSearch(); document.querySelector('.navbar-search input').value = ''; document.getElementById('searchNotification').remove();" style="margin-left: 16px; padding: 4px 12px; background: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; color: #D8122A;">Clear</button>
    `;

  // Insert after navbar
  const navbar = document.querySelector(".navbar");
  if (navbar && navbar.nextSibling) {
    navbar.parentNode.insertBefore(notification, navbar.nextSibling);
  } else {
    document.body.insertBefore(notification, document.body.firstChild);
  }
}

// Escape special regex characters
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

