const elements = {
  temp_unit_button: document.getElementById("temp-unit-button"),
  temp_unit_button_text: document.getElementById("temp-unit-button-text"),
  searchbar: document.getElementById("searchbar"),
  location: document.getElementById("location"),
  main_location: document.getElementById("main-location"),
  main_date: document.getElementById("main-date"),
  main_temp: document.getElementById("main-temp"),
  main_feels_temp: document.getElementById("feels-temp"),
  main_emoji: document.getElementById("main-emoji"),
  main_precipitation: document.getElementById("main-percipitation"),
  main_humidity: document.getElementById("main-humidity"),
  main_wind: document.getElementById("main-wind"),

  days: Array.from(document.querySelectorAll(".day")),

  search_results_wrapper: document.getElementById("search-results-wrapper"),
  search_result_template: document.getElementById("search-result-template"),
};

const default_city = "Milford, Massachusetts";

fetch(
  `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${default_city}` +
    `&count=1` +
    `&language=en` +
    `&format=json`,
).then((response) =>
  response.json().then((data) => {
    const city = data.results[0];
    update_location(
      city.latitude,
      city.longitude,
      city.name + ", " + abbreviate_state(city.admin1),
    );
  }),
);

let controller;
let cities = null;

// EVENT LISTENERS

elements.temp_unit_button.addEventListener("click", () => {
  if (elements.temp_unit_button_text.textContent === "F") {
    elements.temp_unit_button_text.textContent = "C";
  } else {
    elements.temp_unit_button_text.textContent = "F";
  }
});

elements.searchbar.addEventListener("input", async (event) => {
  const input = event.target.value.trim();

  elements.search_results_wrapper.innerHTML = "";

  elements.search_results_wrapper.classList.remove("hide");

  if (input.length < 2) {
    return;
  }

  controller?.abort();
  controller = new AbortController();

  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search` +
        `?name=${encodeURIComponent(input)}` +
        `&count=10` +
        `&language=en` +
        `&format=json`,
      { signal: controller.signal },
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    cities = await response.json();
    console.log(cities);

    for (const city of cities.results ?? []) {
      const result_card =
        elements.search_result_template.content.cloneNode(true).children[0];

      const city_name = city.name + ", " + abbreviate_state(city.admin1);

      result_card.addEventListener("click", () => {
        update_location(city.latitude, city.longitude, city_name);
        elements.search_results_wrapper.innerHTML = "";
        elements.search_results_wrapper.classList.add("hide");
        elements.searchbar.reset();
      });

      const city_name_text = result_card.querySelector(".city-name");

      city_name_text.textContent = city_name;
      elements.search_results_wrapper.append(result_card);
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("Geocoding failed:", error);
    }
  }
});

elements.searchbar.addEventListener("submit", (event) => {
  event.preventDefault();

  if (cities != null) {
    const city = cities.results[0];
    const city_name = city.name + ", " + abbreviate_state(city.admin1);

    update_location(city.latitude, city.longitude, city_name);
    elements.search_results_wrapper.innerHTML = "";
    elements.search_results_wrapper.classList.add("hide");
    elements.searchbar.reset();
  }
});

// DOM MANIPULATION

async function update_location(lat, long, name) {
  get_weather(lat, long).then((weather_data) => {
    update_main_widget(weather_data.current, name);
    update_day_widgets(weather_data.daily);
  });
}

function update_main_widget(weather_data, location_name) {
  elements.main_location.textContent = location_name;

  elements.main_temp.textContent =
    Math.round(Number(weather_data.temperature_2m)) + "°";

  elements.main_feels_temp.textContent =
    Math.round(Number(weather_data.apparent_temperature)) + "°";

  elements.main_precipitation.textContent =
    Math.round(Number(weather_data.precipitation)) + "%";

  elements.main_humidity.textContent = weather_data.relative_humidity_2m + "%";

  elements.main_wind.textContent =
    Math.round(Number(weather_data.wind_speed_10m)) + " mph";

  elements.main_emoji.src = weather_code_to_emoji(
    weather_data.weather_code,
    weather_data.is_day,
  );
}

function update_day_widgets(weather_data) {
  for (let i = 0; i < 7; i++) {
    const day = elements.days[i];

    day.querySelector(".day-date").textContent = iso_to_date(
      weather_data.time[i],
    );

    day.querySelector(".day-icon").src = weather_code_to_emoji(
      weather_data.weather_code[i],
      true, // Daily emoji should always be day version
    );
    day.querySelector(".hi").textContent =
      Math.round(Number(weather_data.temperature_2m_max[i])) + "°H";
    day.querySelector(".lo").textContent =
      Math.round(Number(weather_data.temperature_2m_min[i])) + "°L";
  }

  elements.days[0].querySelector(".day-date").textContent = "Today";
}

// FETCH

async function get_weather(lat, long) {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}` +
      `&longitude=${long}` +
      `&current=` +
      `temperature_2m,` +
      `relative_humidity_2m,` +
      `apparent_temperature,` +
      `precipitation,` +
      `weather_code,` +
      `wind_speed_10m,` +
      `is_day` +
      `&timezone=auto` +
      `&daily=` +
      `sunrise,` +
      `sunset,` +
      `weather_code,` +
      `temperature_2m_max,` +
      `temperature_2m_min` +
      `&wind_speed_unit=mph` +
      `&temperature_unit=fahrenheit`,
  );
  return response.json();
}

// TRANFORMERS

function weather_code_to_emoji(weatherCode, isDay) {
  let path = "assets/icons/weather/";
  switch (weatherCode) {
    case 0:
    case 1:
      if (isDay) {
        path = path + "clear";
      } else {
        path = path + "clear-night";
      }
      break;
    case 2:
      if (isDay) {
        path = path + "partly-cloudy";
      } else {
        path = path + "partly-cloudy-night";
      }
      break;
    case 3:
      path = path + "overcast";
      break;
    case 45:
    case 48:
      path = path + "fog";
      break;
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
      path = path + "rain";
      break;
    case 71:
    case 73:
    case 75:
    case 77:
      path = path + "snow";
      break;
    case 80:
    case 81:
    case 82:
    case 85:
    case 86:
      path = path + "showers";
      break;
    case 95:
    case 96:
    case 99:
      path = path + "thunderstorm";
      break;

    default:
      path = "assets/icons/unloaded";
      break;
  }
  path = path + ".svg";
  return path;
}

function abbreviate_state(state) {
  const stateAbbreviations = {
    Alabama: "AL",
    Alaska: "AK",
    Arizona: "AZ",
    Arkansas: "AR",
    California: "CA",
    Colorado: "CO",
    Connecticut: "CT",
    Delaware: "DE",
    Florida: "FL",
    Georgia: "GA",
    Hawaii: "HI",
    Idaho: "ID",
    Illinois: "IL",
    Indiana: "IN",
    Iowa: "IA",
    Kansas: "KS",
    Kentucky: "KY",
    Louisiana: "LA",
    Maine: "ME",
    Maryland: "MD",
    Massachusetts: "MA",
    Michigan: "MI",
    Minnesota: "MN",
    Mississippi: "MS",
    Missouri: "MO",
    Montana: "MT",
    Nebraska: "NE",
    Nevada: "NV",
    NewHampshire: "NH",
    NewJersey: "NJ",
    NewMexico: "NM",
    NewYork: "NY",
    NorthCarolina: "NC",
    NorthDakota: "ND",
    Ohio: "OH",
    Oklahoma: "OK",
    Oregon: "OR",
    Pennsylvania: "PA",
    RhodeIsland: "RI",
    SouthCarolina: "SC",
    SouthDakota: "SD",
    Tennessee: "TN",
    Texas: "TX",
    Utah: "UT",
    Vermont: "VT",
    Virginia: "VA",
    Washington: "WA",
    WestVirginia: "WV",
    Wisconsin: "WI",
    Wyoming: "WY",
  };

  return stateAbbreviations[state];
}

function iso_to_date(iso_date) {
  const day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const segs = iso_date.split("-");
  return day_names[new Date(iso_date).getDay()] + " " + String(Number(segs[2]));
}
