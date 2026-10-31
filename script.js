const filterButtons = document.querySelectorAll(".work-filters .filter-button");
const projectItems = document.querySelectorAll(".case-study[data-category]");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedFilter = button.dataset.filter;

    filterButtons.forEach((filterButton) => {
      const isActive = filterButton === button;
      filterButton.classList.toggle("is-active", isActive);
      filterButton.setAttribute("aria-pressed", String(isActive));
    });

    projectItems.forEach((item) => {
      const categories = item.dataset.category.split(/\s+/);
      const shouldShow = selectedFilter === "all" || categories.includes(selectedFilter);
      item.classList.toggle("is-filtered-out", !shouldShow);
    });
  });
});

const experienceTabs = document.querySelectorAll("#experience .experience-filter-button");

experienceTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => {
    experienceTabs.forEach((experienceTab) => {
      const isSelected = experienceTab === tab;
      experienceTab.classList.toggle("is-active", isSelected);
      experienceTab.setAttribute("aria-selected", String(isSelected));
      experienceTab.tabIndex = isSelected ? 0 : -1;

      const panel = document.getElementById(experienceTab.getAttribute("aria-controls"));
      panel.hidden = !isSelected;
    });
  });

  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + experienceTabs.length) % experienceTabs.length;
    experienceTabs[nextIndex].focus();
    experienceTabs[nextIndex].click();
  });
});

const educationTabs = document.querySelectorAll('#credentials .experience-filter-button');
educationTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => {
    educationTabs.forEach((item) => {
      const selected = item === tab;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute("aria-controls")).hidden = !selected;
    });
  });
  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = educationTabs[(index + direction + educationTabs.length) % educationTabs.length];
    next.focus();
    next.click();
  });
});

// Sort each dated content group by its most recent date, newest first.
const getItemDate = (item) => {
  const datetime = item.querySelector("time[datetime]")?.dateTime;
  if (!datetime) return Number.NEGATIVE_INFINITY;

  // A period is stored as start/end, so sort it by the end date.
  const endDate = datetime.split("/").pop();
  const match = endDate.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!match) return Number.NEGATIVE_INFINITY;

  const [, year, month = "01", day = "01"] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
};

document.querySelectorAll("#experience .experience-list, #credentials .experience-list, #credentials .certificate-grid").forEach((list) => {
  Array.from(list.children)
    .map((item, index) => ({ item, index, date: getItemDate(item) }))
    .sort((a, b) => b.date - a.date || a.index - b.index)
    .forEach(({ item }) => list.append(item));
});

const reducedMotionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

const observeVisibility = (element, onChange) => {
  let isIntersecting = false;
  const updateVisibility = () => onChange(isIntersecting && !document.hidden);

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      isIntersecting = entry.isIntersecting;
      updateVisibility();
    }, { threshold: 0.25 });
    observer.observe(element);
  } else {
    isIntersecting = true;
  }

  document.addEventListener("visibilitychange", updateVisibility);
  updateVisibility();
  return updateVisibility;
};

const motionSliders = document.querySelectorAll(".exploration-motion-frame");

motionSliders.forEach((frame) => {
  const slides = Array.from(frame.querySelectorAll(".exploration-motion-video"));
  const title = frame.parentElement.querySelector(".exploration-motion-title");
  const description = frame.parentElement.querySelector(".exploration-motion-description");
  let activeIndex = slides.findIndex((slide) => slide.classList.contains("is-active"));
  let isVisible = false;

  if (activeIndex < 0) activeIndex = 0;

  const updatePlayback = () => {
    const activeSlide = slides[activeIndex];
    if (!isVisible || reducedMotionPreference.matches) {
      activeSlide.pause();
      return;
    }

    const playback = activeSlide.play();
    if (playback) {
      playback.catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Could not play project motion video:", activeSlide.currentSrc, error);
        }
      });
    }
  };

  const showSlide = (index) => {
    const previousSlide = slides[activeIndex];
    previousSlide.pause();
    previousSlide.classList.add("is-leaving");
    previousSlide.classList.remove("is-active");
    previousSlide.setAttribute("aria-hidden", "true");

    activeIndex = index % slides.length;
    const activeSlide = slides[activeIndex];
    activeSlide.hidden = false;
    activeSlide.currentTime = 0;
    activeSlide.classList.remove("is-leaving");
    activeSlide.classList.add("is-active");
    activeSlide.removeAttribute("aria-hidden");
    if (title) title.textContent = activeSlide.dataset.title;
    if (description) description.textContent = activeSlide.dataset.description;
    updatePlayback();

    window.setTimeout(() => {
      if (!previousSlide.classList.contains("is-active")) {
        previousSlide.hidden = true;
        previousSlide.classList.remove("is-leaving");
      }
    }, reducedMotionPreference.matches ? 0 : 460);
  };

  slides.forEach((slide, index) => {
    slide.addEventListener("ended", () => {
      if (index === activeIndex) showSlide((activeIndex + 1) % slides.length);
    });
    slide.addEventListener("error", () => {
      console.error("Could not load project motion video:", slide.currentSrc || slide.querySelector("source").src);
    });
  });

  observeVisibility(frame, (visible) => {
    isVisible = visible;
    updatePlayback();
  });

  reducedMotionPreference.addEventListener("change", updatePlayback);
});

const imageSliders = document.querySelectorAll(".exploration-image-slider");

imageSliders.forEach((frame) => {
  const slides = Array.from(frame.querySelectorAll(".exploration-image-slide"));
  let activeIndex = slides.findIndex((slide) => slide.classList.contains("is-active"));
  let intervalId;
  let isVisible = false;

  const stop = () => {
    window.clearInterval(intervalId);
    intervalId = undefined;
  };

  const showNextSlide = () => {
    slides[activeIndex].classList.add("is-leaving");
    slides[activeIndex].classList.remove("is-active");
    slides[activeIndex].setAttribute("aria-hidden", "true");

    activeIndex = (activeIndex + 1) % slides.length;
    slides[activeIndex].classList.remove("is-leaving");
    slides[activeIndex].classList.add("is-active");
    slides[activeIndex].removeAttribute("aria-hidden");
  };

  const updateRotation = () => {
    if (!isVisible || reducedMotionPreference.matches) {
      stop();
      return;
    }

    if (intervalId === undefined) {
      intervalId = window.setInterval(showNextSlide, 2400);
    }
  };

  slides.forEach((slide) => {
    slide.addEventListener("error", () => {
      console.error("Could not load exploration image:", slide.currentSrc || slide.src);
    });
  });

  observeVisibility(frame, (visible) => {
    isVisible = visible;
    updateRotation();
  });

  reducedMotionPreference.addEventListener("change", updateRotation);
});

const parallaxTargets = Array.from(document.querySelectorAll(".hero-visual img, .case-image img"))
  .map((element) => ({
    element,
    speed: element.closest(".hero-visual") ? 0.07 : 0.035,
  }));
const smallScreenPreference = window.matchMedia("(max-width: 640px)");
let parallaxFrame;

const updateParallax = () => {
  parallaxFrame = undefined;

  if (reducedMotionPreference.matches || smallScreenPreference.matches) {
    parallaxTargets.forEach(({ element }) => {
      element.style.removeProperty("--scroll-parallax-y");
      element.classList.remove("has-scroll-parallax");
    });
    return;
  }

  const viewportCenter = window.innerHeight / 2;
  parallaxTargets.forEach(({ element, speed }) => {
    const bounds = element.getBoundingClientRect();
    if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;

    const distanceFromCenter = viewportCenter - (bounds.top + bounds.height / 2);
    const offset = Math.max(-22, Math.min(22, distanceFromCenter * speed));
    element.style.setProperty("--scroll-parallax-y", `${offset.toFixed(1)}px`);
    element.classList.add("has-scroll-parallax");
  });
};

const scheduleParallaxUpdate = () => {
  if (parallaxFrame === undefined) {
    parallaxFrame = window.requestAnimationFrame(updateParallax);
  }
};

window.addEventListener("scroll", scheduleParallaxUpdate, { passive: true });
window.addEventListener("resize", scheduleParallaxUpdate);
reducedMotionPreference.addEventListener("change", scheduleParallaxUpdate);
smallScreenPreference.addEventListener("change", scheduleParallaxUpdate);
scheduleParallaxUpdate();
