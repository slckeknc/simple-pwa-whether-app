// Register Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("ServiceWorker registration successful");
      })
      .catch((err) => {
        console.log("ServiceWorker registration failed: ", err);
      });
  });
}

// API Configuration
const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
if (!API_KEY) {
  console.error("OpenWeather API key is missing! Please check your .env file.");
}

const BASE_URL = "https://api.openweathermap.org/data/2.5";
const GEO_BASE_URL = "https://api.openweathermap.org/geo/1.0";

// Cache Management
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Translations
const TRANSLATIONS = {
  en: {
    settings: "Settings",
    theme: "Theme",
    dark: "Dark",
    light: "Light",
    cities: "Cities",
    addCity: "Add City",
    searchCity: "Search city...",
    search: "Search",
    timeFormat: "Time Format",
    temperatureUnit: "Temperature Unit",
    language: "Language",
    close: "Close",
    changeMain: "Change",
    makeMain: "Make Main",
    main: "Main",
    maxCitiesError: "Maximum 2 additional cities allowed!",
    cityExistsError: "This city is already in your list!",
    weatherError: "fetch weather data",
    forecastError: "fetch forecast data",
  },
  tr: {
    settings: "Ayarlar",
    theme: "Tema",
    dark: "Koyu",
    light: "Açık",
    cities: "Şehirler",
    addCity: "Şehir Ekle",
    searchCity: "Şehir ara...",
    search: "Ara",
    timeFormat: "Saat Formatı",
    temperatureUnit: "Sıcaklık Birimi",
    language: "Dil",
    close: "Kapat",
    changeMain: "Değiştir",
    makeMain: "Ana Şehir Yap",
    main: "Ana",
    maxCitiesError: "En fazla 2 ek şehir eklenebilir!",
    cityExistsError: "Bu şehir zaten listenizde!",
    weatherError: "hava durumu verisi alınamadı",
    forecastError: "tahmin verisi alınamadı",
  },
};

// Helper function to get translation
function t(key) {
  return TRANSLATIONS[APP_SETTINGS.language][key] || key;
}

// Update all UI texts based on selected language
function updateUITexts() {
  // Update settings modal texts
  document.querySelector(".settings-content h2").textContent = t("settings");
  document.querySelector(".theme-container h3").textContent = t("theme");
  document.querySelectorAll(".theme-btn").forEach((btn) => {
    if (btn.dataset.theme === "dark") btn.textContent = t("dark");
    if (btn.dataset.theme === "light") btn.textContent = t("light");
  });
  document.querySelector(".cities-section h3").textContent = t("cities");
  document.querySelector(".add-city-btn").textContent = t("addCity");
  document.querySelector("#citySearch").placeholder = t("searchCity");
  document.querySelector("#searchBtn").textContent = t("search");
  document.querySelector(".time-format-container h3").textContent =
    t("timeFormat");
  document.querySelector(".temperature-unit-container h3").textContent =
    t("temperatureUnit");
  document.querySelector(".language-container h3").textContent = t("language");
  document.querySelector(".close-settings").textContent = t("close");

  // Update cities list
  updateCitiesList();
}

function getCacheKey(type, lat, lon, unit) {
  return `weather_cache_${type}_${lat}_${lon}_${unit}_${APP_SETTINGS.language}`;
}

function getFromCache(type, lat, lon, unit) {
  const key = getCacheKey(type, lat, lon, unit);
  const cached = localStorage.getItem(key);
  if (!cached) return null;

  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp > CACHE_DURATION) {
    localStorage.removeItem(key);
    return null;
  }

  return data;
}

function saveToCache(type, lat, lon, unit, data) {
  const key = getCacheKey(type, lat, lon, unit);
  const cacheData = {
    data,
    timestamp: Date.now(),
  };
  localStorage.setItem(key, JSON.stringify(cacheData));
}

// Error handling improvement
function handleApiError(error, context) {
  console.error(`Error in ${context}:`, error);
  const errorMessage =
    error.response?.data?.message || error.message || t("error");
  alert(`${t(context)}. ${errorMessage}`);
}

// Weather API Functions with improved error handling
async function getWeatherData(lat, lon) {
  try {
    const units = APP_SETTINGS.tempUnit === "F" ? "imperial" : "metric";

    // Check cache first
    const cachedData = getFromCache("weather", lat, lon, units);
    if (cachedData) {
      return cachedData;
    }

    const response = await fetch(
      `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${units}&lang=${APP_SETTINGS.language}&appid=${API_KEY}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Weather data not found");
    }

    const data = await response.json();
    saveToCache("weather", lat, lon, units, data);
    return data;
  } catch (error) {
    handleApiError(error, "fetch weather data");
    return null;
  }
}

async function getForecastData(lat, lon) {
  try {
    const units = APP_SETTINGS.tempUnit === "F" ? "imperial" : "metric";

    // Check cache first
    const cachedData = getFromCache("forecast", lat, lon, units);
    if (cachedData) {
      return cachedData;
    }

    const response = await fetch(
      `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=${units}&lang=${APP_SETTINGS.language}&appid=${API_KEY}`
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Forecast data not found");
    }
    const data = await response.json();

    // Save to cache
    saveToCache("forecast", lat, lon, units, data);

    return data;
  } catch (error) {
    console.error("Error fetching forecast:", error);
    return null;
  }
}

// State management
function getDefaultTheme() {
  // First check if there's a saved theme in localStorage
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) return savedTheme;

  // If not, check system theme
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

// Listen for system theme changes
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    // Only apply system theme if user hasn't manually selected a theme
    if (!localStorage.getItem("theme")) {
      setTheme(e.matches ? "dark" : "light");
    }
  });

const APP_SETTINGS = {
  timeFormat: localStorage.getItem("timeFormat") || "24",
  cities: JSON.parse(localStorage.getItem("cities")) || [],
  mainCity: JSON.parse(localStorage.getItem("mainCity")) || null,
  tempUnit: localStorage.getItem("tempUnit") || "C",
  isFirstVisit: !localStorage.getItem("mainCity"),
  theme: getDefaultTheme(),
  language: localStorage.getItem("language") || "tr", // Default to Turkish
};

// DOM Elements
const hamburgerBtn = document.querySelector(".hamburger-btn");
const settingsModal = document.querySelector(".settings-modal");
const closeSettingsBtn = document.querySelector(".close-settings");
const citySearch = document.getElementById("citySearch");
const searchBtn = document.getElementById("searchBtn");
const citySuggestions = document.querySelector(".city-suggestions");
const searchContainer = document.querySelector(".search-container");
const citiesList = document.querySelector(".cities-list");
const addCityBtn = document.querySelector(".add-city-btn");
const locationSearch = document.querySelector(".location-search");
const themeBtns = document.querySelectorAll(".theme-btn");
const timeFormatBtns = document.querySelectorAll(".time-format-btn");
const temperatureUnitBtns = document.querySelectorAll(".temperature-unit-btn");
const languageBtns = document.querySelectorAll(".language-btn");

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  // Modal event listeners
  hamburgerBtn?.addEventListener("click", openModal);
  closeSettingsBtn?.addEventListener("click", closeModal);
  settingsModal?.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      closeModal();
    }
  });

  // Add city button event listener
  addCityBtn?.addEventListener("click", () => {
    if (APP_SETTINGS.cities.length < 2) {
      locationSearch.hidden = false;
      searchContainer.hidden = false;
      citySearch.focus();
    }
  });

  // Search functionality
  let searchTimeout;
  citySearch?.addEventListener("input", (e) => {
    const query = e.target.value.trim();

    if (!query) {
      citySuggestions.hidden = true;
      return;
    }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => searchCities(query), 300);
  });

  // Time format buttons event listeners
  timeFormatBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      timeFormatBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      APP_SETTINGS.timeFormat = btn.dataset.format;
      localStorage.setItem("timeFormat", APP_SETTINGS.timeFormat);
      updateCurrentTime();
    });
  });

  // Temperature unit buttons event listeners
  temperatureUnitBtns.forEach((btn) => {
    btn.addEventListener("click", async () => {
      temperatureUnitBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      APP_SETTINGS.tempUnit = btn.dataset.unit;
      localStorage.setItem("tempUnit", APP_SETTINGS.tempUnit);
      await updateAllCityCards();
    });
  });

  // Theme buttons event listeners
  themeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      themeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      setTheme(btn.dataset.theme);
    });
  });

  // Language buttons event listeners
  languageBtns.forEach((btn) => {
    btn.addEventListener("click", async () => {
      languageBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const oldLang = APP_SETTINGS.language;
      APP_SETTINGS.language = btn.dataset.lang;
      localStorage.setItem("language", APP_SETTINGS.language);

      // If language changed, refresh city data
      if (oldLang !== APP_SETTINGS.language) {
        // Clear weather cache to force refresh
        Object.keys(localStorage).forEach((key) => {
          if (
            key.startsWith("weather_cache_") ||
            key.startsWith("geo_cache_")
          ) {
            localStorage.removeItem(key);
          }
        });

        // Refresh main city data if exists
        if (APP_SETTINGS.mainCity) {
          const mainCityData = await getWeatherData(
            APP_SETTINGS.mainCity.lat,
            APP_SETTINGS.mainCity.lon
          );
          if (mainCityData) {
            APP_SETTINGS.mainCity.name = mainCityData.name;
          }
        }

        // Refresh additional cities data
        for (let i = 0; i < APP_SETTINGS.cities.length; i++) {
          const city = APP_SETTINGS.cities[i];
          const cityData = await getWeatherData(city.lat, city.lon);
          if (cityData) {
            APP_SETTINGS.cities[i].name = cityData.name;
          }
        }

        // Save updated city names
        saveCities();
      }

      updateUITexts();
      await updateAllCityCards();
    });
  });

  // Initialize the app
  initApp();
});

// City Management Functions
function saveCities() {
  localStorage.setItem("cities", JSON.stringify(APP_SETTINGS.cities));
  localStorage.setItem("mainCity", JSON.stringify(APP_SETTINGS.mainCity));
}

function addCity(city) {
  if (APP_SETTINGS.cities.length >= 2) {
    alert(t("maxCitiesError"));
    return false;
  }

  if (
    APP_SETTINGS.cities.some((c) => c.name === city.name) ||
    APP_SETTINGS.mainCity.name === city.name
  ) {
    alert(t("cityExistsError"));
    return false;
  }

  APP_SETTINGS.cities.push(city);
  saveCities();
  updateCitiesList();
  updateAllCityCards();
  return true;
}

function removeCity(cityName) {
  APP_SETTINGS.cities = APP_SETTINGS.cities.filter(
    (city) => city.name !== cityName
  );
  saveCities();
  updateCitiesList();
  updateAllCityCards();
}

function setMainCity(city) {
  APP_SETTINGS.mainCity = city;
  saveCities();
  updateAllCityCards();
}

function updateCitiesList() {
  citiesList.innerHTML = "";

  // Main city - only show if exists
  if (APP_SETTINGS.mainCity) {
    const mainCityItem = document.createElement("div");
    mainCityItem.className = "city-item";
    mainCityItem.innerHTML = `
      <span>${APP_SETTINGS.mainCity.name} (${t("main")})</span>
      <button class="change-main-city">${t("changeMain")}</button>
    `;
    citiesList.appendChild(mainCityItem);

    // Add event listener to change main city button
    mainCityItem
      .querySelector(".change-main-city")
      .addEventListener("click", () => {
        locationSearch.hidden = false;
        searchContainer.hidden = false;
        citySearch.focus();
        citySearch.dataset.purpose = "main";
      });
  }

  // Additional cities
  APP_SETTINGS.cities.forEach((city) => {
    const cityItem = document.createElement("div");
    cityItem.className = "city-item";
    cityItem.innerHTML = `
      <span>${city.name}</span>
      <div class="city-actions">
        <button class="make-main" data-city="${city.name}">${t("makeMain")}</button>
        <button class="delete-city" data-city="${city.name}">×</button>
      </div>
    `;
    citiesList.appendChild(cityItem);
  });

  // Add event listeners to buttons
  document.querySelectorAll(".delete-city").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const cityName = e.target.dataset.city;
      removeCity(cityName);
    });
  });

  document.querySelectorAll(".make-main").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const cityName = e.target.dataset.city;
      const city = APP_SETTINGS.cities.find((c) => c.name === cityName);
      if (city) {
        const oldMain = APP_SETTINGS.mainCity;
        APP_SETTINGS.mainCity = city;
        APP_SETTINGS.cities = APP_SETTINGS.cities.filter(
          (c) => c.name !== cityName
        );
        if (oldMain) {
          APP_SETTINGS.cities.unshift(oldMain);
        }
        saveCities();
        updateCitiesList();
        updateAllCityCards();
      }
    });
  });

  // Hide/show add city button based on city count
  const addCityBtn = document.querySelector(".add-city-btn");
  if (APP_SETTINGS.cities.length >= 2) {
    addCityBtn.style.display = "none";
    if (citySearch.dataset.purpose !== "main") {
      locationSearch.hidden = true;
    }
  } else {
    addCityBtn.style.display = "block";
  }
}

async function updateCityCard(city, cardElement) {
  const weatherData = await getWeatherData(city.lat, city.lon);
  const forecastData = await getForecastData(city.lat, city.lon);

  if (!weatherData || !forecastData) return;

  // Store timezone for the city
  city._timezone = weatherData.timezone;

  // Always use day icon
  const icon = weatherData.weather[0].icon.replace("n", "d");

  cardElement.innerHTML = `
    <div class="city-name">${city.name}</div>
    <div class="current-time">${formatTime(new Date(), weatherData.timezone)}</div>
    <div class="weather-icon">
      <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="weather">
    </div>
    <div class="temperature">${formatTemperature(weatherData.main.temp)}</div>
    <div class="weather-details">
      <div class="weather-detail">
        <span class="detail-icon">💨</span>
        <span class="detail-value">${Math.round(weatherData.wind.speed)} m/s</span>
      </div>
      <div class="weather-detail">
        <span class="detail-icon">💧</span>
        <span class="detail-value">${weatherData.main.humidity}%</span>
      </div>
    </div>
    <div class="forecast-container">
      <div class="forecast-days">
        ${generateForecastHTML(forecastData)}
      </div>
    </div>
  `;
}

function generateForecastHTML(data) {
  const days = ["SU", "M", "T", "W", "TH", "F", "S"];
  return data.list
    .filter((item) => item.dt_txt.includes("12:00:00"))
    .slice(0, 5)
    .map((forecast) => {
      const date = new Date(forecast.dt * 1000);
      const day = days[date.getDay()];
      const icon = forecast.weather[0].icon.replace("n", "d"); // Her zaman gündüz ikonunu kullan
      return `
        <div class="forecast-day">
          <span class="day">${day}</span>
          <div class="weather-circle">
            <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="weather">
          </div>
          <span class="temp">${formatTemperature(forecast.main.temp)}</span>
        </div>
      `;
    })
    .join("");
}

async function updateAllCityCards() {
  const cityCards = document.querySelectorAll(".city-card");

  // Update main city if exists
  const mainCityCard = document.querySelector(".city-card.main-city");
  if (APP_SETTINGS.mainCity && mainCityCard) {
    mainCityCard.classList.remove("placeholder");
    await updateCityCard(APP_SETTINGS.mainCity, mainCityCard);
  } else if (mainCityCard) {
    mainCityCard.classList.add("placeholder");
    mainCityCard.innerHTML = '<div class="add-icon">+</div>';
    mainCityCard.style.cursor = "pointer";
    mainCityCard.addEventListener("click", openCitySearch);
  }

  // Update additional city cards or show placeholders
  const [leftCard, _, rightCard] = cityCards;

  if (APP_SETTINGS.cities[0]) {
    leftCard.classList.remove("placeholder");
    leftCard.innerHTML = "";
    await updateCityCard(APP_SETTINGS.cities[0], leftCard);
  } else {
    leftCard.classList.add("placeholder");
    leftCard.innerHTML = '<div class="add-icon">+</div>';
  }

  if (APP_SETTINGS.cities[1]) {
    rightCard.classList.remove("placeholder");
    rightCard.innerHTML = "";
    await updateCityCard(APP_SETTINGS.cities[1], rightCard);
  } else {
    rightCard.classList.add("placeholder");
    rightCard.innerHTML = '<div class="add-icon">+</div>';
  }

  // Update placeholder handlers
  updatePlaceholderHandlers();
}

// Modal Functions
function openModal() {
  settingsModal.classList.add("show");
}

function closeModal() {
  settingsModal.classList.remove("show");
  locationSearch.hidden = true;
  citySuggestions.hidden = true;
}

// Event Listeners
hamburgerBtn.addEventListener("click", openModal);
closeSettingsBtn.addEventListener("click", closeModal);
settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) {
    closeModal();
  }
});

// Placeholder click handlers
function updatePlaceholderHandlers() {
  document.querySelectorAll(".city-card.placeholder").forEach((card) => {
    if (APP_SETTINGS.cities.length >= 2) {
      card.style.cursor = "default";
      card.removeEventListener("click", openCitySearch);
    } else {
      card.style.cursor = "pointer";
      card.addEventListener("click", openCitySearch);
    }
  });
}

function openCitySearch() {
  if (APP_SETTINGS.cities.length < 2) {
    openModal();
    locationSearch.hidden = false;
    searchContainer.hidden = false;
    citySearch.focus();
  }
}

// Event Listeners
addCityBtn.addEventListener("click", () => {
  if (APP_SETTINGS.cities.length < 2) {
    locationSearch.hidden = false;
    searchContainer.hidden = false;
    citySearch.focus();
  }
});

// Search functionality
let searchTimeout;
citySearch.addEventListener("input", (e) => {
  const query = e.target.value.trim();

  if (!query) {
    citySuggestions.hidden = true;
    return;
  }

  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => searchCities(query), 300);
});

async function searchCities(query) {
  try {
    // Check cache first
    const cacheKey = `geo_cache_${query.toLowerCase()}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        showSuggestions(data);
        return;
      }
      localStorage.removeItem(cacheKey);
    }

    const response = await fetch(
      `${GEO_BASE_URL}/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`
    );
    if (!response.ok) throw new Error("Geocoding failed");

    const cities = await response.json();

    // Save to cache
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        data: cities,
        timestamp: Date.now(),
      })
    );

    showSuggestions(cities);
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    citySuggestions.hidden = true;
  }
}

function showSuggestions(cities) {
  if (cities.length === 0) {
    citySuggestions.hidden = true;
    return;
  }

  citySuggestions.innerHTML = "";
  cities.forEach((city) => {
    citySuggestions.appendChild(createSuggestionElement(city));
  });
  citySuggestions.hidden = false;
}

// Time format functions
function formatTime(date, timezone) {
  // timezone offset is in seconds, convert to milliseconds
  const localTime = new Date(date.getTime() + timezone * 1000);

  let hours = localTime.getUTCHours();
  let minutes = localTime.getUTCMinutes();

  if (APP_SETTINGS.timeFormat === "12") {
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function updateCurrentTime() {
  const now = new Date();

  // Update main city time if exists
  if (APP_SETTINGS.mainCity && APP_SETTINGS.mainCity._timezone) {
    const mainTimeElement = document.querySelector(
      ".city-card.main-city .current-time"
    );
    if (mainTimeElement) {
      mainTimeElement.textContent = formatTime(
        now,
        APP_SETTINGS.mainCity._timezone
      );
    }
  }

  // Update additional cities time
  APP_SETTINGS.cities.forEach((city, index) => {
    if (city._timezone) {
      const timeElement = document.querySelectorAll(
        ".city-card:not(.main-city):not(.placeholder) .current-time"
      )[index];
      if (timeElement) {
        timeElement.textContent = formatTime(now, city._timezone);
      }
    }
  });
}

// Temperature format function
function formatTemperature(temp) {
  return `${Math.round(temp)}°${APP_SETTINGS.tempUnit}`;
}

// Settings management
function loadSettings() {
  timeFormatBtns.forEach((btn) => {
    if (btn.dataset.format === APP_SETTINGS.timeFormat) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  temperatureUnitBtns.forEach((btn) => {
    if (btn.dataset.unit === APP_SETTINGS.tempUnit) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Theme settings
  themeBtns.forEach((btn) => {
    if (btn.dataset.theme === APP_SETTINGS.theme) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Set active language button
  const activeLangBtn = document.querySelector(
    `.language-btn[data-lang="${APP_SETTINGS.language}"]`
  );
  if (activeLangBtn) {
    languageBtns.forEach((btn) => btn.classList.remove("active"));
    activeLangBtn.classList.add("active");
  }

  // Apply current theme
  setTheme(APP_SETTINGS.theme);
}

timeFormatBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    timeFormatBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    APP_SETTINGS.timeFormat = btn.dataset.format;
    localStorage.setItem("timeFormat", APP_SETTINGS.timeFormat);
    updateCurrentTime();
  });
});

temperatureUnitBtns.forEach((btn) => {
  btn.addEventListener("click", async () => {
    temperatureUnitBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    APP_SETTINGS.tempUnit = btn.dataset.unit;
    localStorage.setItem("tempUnit", APP_SETTINGS.tempUnit);
    await updateAllCityCards();
  });
});

// Theme management
function setTheme(theme) {
  if (theme === "light") {
    document.body.classList.add("light-mode");
  } else {
    document.body.classList.remove("light-mode");
  }
  APP_SETTINGS.theme = theme;
  // Save theme to localStorage only if it's different from the system theme
  if (theme !== getDefaultTheme()) {
    localStorage.setItem("theme", theme);
  } else {
    localStorage.removeItem("theme"); // Remove from localStorage if it's the same as the system theme
  }
}

// Theme button event listeners
themeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    themeBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    setTheme(btn.dataset.theme);
  });
});

// Initialize app with cache cleanup
async function initApp() {
  loadSettings();
  cleanupCache(); // Clean up expired cache entries on startup
  updateUITexts(); // Update UI texts on app start

  if (APP_SETTINGS.isFirstVisit) {
    openModal();
    locationSearch.hidden = false;
    searchContainer.hidden = false;
    citySearch.focus();
    citySearch.dataset.purpose = "main";
  } else {
    updateCitiesList();
    await updateAllCityCards();
  }

  updateCurrentTime();
  setInterval(updateCurrentTime, 1000);
  setInterval(cleanupCache, CACHE_DURATION);
}

// Modified createSuggestionElement function
function createSuggestionElement(city) {
  const div = document.createElement("div");
  div.className = "city-suggestion";
  div.innerHTML = `
    <span class="city-name">${city.name}</span>
    <span class="country">${city.state ? `${city.state}, ` : ""}${city.country}</span>
  `;

  div.addEventListener("click", async () => {
    const newCity = {
      name: city.name,
      lat: city.lat.toString(),
      lon: city.lon.toString(),
    };

    if (citySearch.dataset.purpose === "main") {
      // If changing main city, move current main city to additional cities if possible
      if (APP_SETTINGS.mainCity && APP_SETTINGS.cities.length < 2) {
        APP_SETTINGS.cities.unshift(APP_SETTINGS.mainCity);
      }
      APP_SETTINGS.mainCity = newCity;
      citySearch.dataset.purpose = "";
    } else {
      if (!addCity(newCity)) return;
    }

    locationSearch.hidden = true;
    citySuggestions.hidden = true;
    citySearch.value = "";
    saveCities();
    updateCitiesList();
    updateAllCityCards();
  });

  return div;
}

// Clear expired cache entries periodically
function cleanupCache() {
  const now = Date.now();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith("weather_cache_") || key.startsWith("geo_cache_")) {
      try {
        const cached = JSON.parse(localStorage.getItem(key));
        if (now - cached.timestamp > CACHE_DURATION) {
          localStorage.removeItem(key);
        }
      } catch (e) {
        localStorage.removeItem(key);
      }
    }
  }
}

// Start the app
initApp();
