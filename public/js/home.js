const themeToggle = document.querySelector(".theme-toggle");
const body = document.body;
const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
const navLinks = document.querySelector(".nav-links");

themeToggle.addEventListener("click", () => {
  body.classList.toggle("dark-mode");
  const icon = themeToggle.querySelector("i");
  if (body.classList.contains("dark-mode")) {
    icon.classList.remove("fa-sun");
    icon.classList.add("fa-moon");
  } else {
    icon.classList.remove("fa-moon");
    icon.classList.add("fa-sun");
  }
});

mobileMenuBtn.addEventListener("click", () => {
  navLinks.classList.toggle("show");
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".navbar")) {
    navLinks.classList.remove("show");
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 768) {
    navLinks.classList.remove("show");
  }
});

document.addEventListener("DOMContentLoaded", function () {
  
  const categoryButtons = document.querySelectorAll(".category-btn");
  const wardrobeItems = document.querySelector(".wardrobe-items");
  const prevBtn = document.querySelector(".nav-btn.prev");
  const nextBtn = document.querySelector(".nav-btn.next");

 
  let currentCategory = 0;
  let isAnimating = false;

   function updateCategory(index) {
    if (isAnimating) return; 
    isAnimating = true;

    categoryButtons.forEach((btn) => btn.classList.remove("active"));
    categoryButtons[index].classList.add("active");

    
    wardrobeItems.style.transition = "transform 0.5s ease";
    wardrobeItems.style.transform = `translateX(-${index * 100}%)`;

    currentCategory = index;

     setTimeout(() => (isAnimating = false), 500);
  }

  nextBtn.addEventListener("click", () => {
    if (currentCategory === categoryButtons.length - 1) {
      
      wardrobeItems.style.transition = "none";
      wardrobeItems.style.transform = "translateX(0)";
      currentCategory = 0;
      setTimeout(() => updateCategory(currentCategory), 0); 
    } else {
      updateCategory((currentCategory + 1) % categoryButtons.length);
    }
  });

  
  prevBtn.addEventListener("click", () => {
    currentCategory =
      (currentCategory - 1 + categoryButtons.length) % categoryButtons.length;
    updateCategory(currentCategory);
  });

  
  categoryButtons.forEach((btn, index) => {
    btn.addEventListener("click", () => updateCategory(index));
  });

 
  let startX;
  wardrobeItems.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
  });

  wardrobeItems.addEventListener("touchmove", (e) => {
    if (!startX) return;
    let diffX = e.touches[0].clientX - startX;

    if (diffX > 50) {
     
      prevBtn.click();
      startX = null;
    } else if (diffX < -50) {
      
      nextBtn.click();
      startX = null;
    }
  });

  updateCategory(currentCategory);
});

document.getElementById("searchButton").addEventListener("click", function () {
  const query = document.getElementById("searchInput").value;
  window.location.href = `/search?query=${encodeURIComponent(query)}`;
});




