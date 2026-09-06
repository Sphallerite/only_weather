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

  loading_image_template: document.getElementById("loading-image-template"),

  bars: Array.from(document.querySelectorAll(".bar")),

  temp_graph_button: document.getElementById("temperature-graph-menu-button"),
  prec_graph_button: document.getElementById("precipitation-graph-menu-button"),

  legend_100: document.getElementById("legend-text-100"),
  legend_75: document.getElementById("legend-text-75"),
  legend_50: document.getElementById("legend-text-50"),
  legend_25: document.getElementById("legend-text-25"),
  legend_0: document.getElementById("legend-text-0"),
};

const default_city = "Milford, Massachusetts";

// GLOBAL STATE (YEAH, GLOBAL STATE 😬)

let controller;
let cities = null;

let weather_data_metric = null;
let weather_data_imperial = null;

let location_name = null;
let is_metric = false;

let wind_unit_text = " mph";
let precipitation_unit_text = " in";

let selected_day = 0;
let selected_type = "temp";

let data = await fetch_and_validate(
  `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${default_city}` +
    `&count=1` +
    `&language=en` +
    `&format=json`,
);
const city = data.results[0];
update_weather_data(city.latitude, city.longitude).then(() => {
  update_all_widgets();
});
location_name = get_city_name(city);

// EVENT LISTENERS

// BUTTONS

elements.temp_unit_button.addEventListener("click", () => {
  if (is_metric) {
    elements.temp_unit_button_text.textContent = "F";
    is_metric = false;
    wind_unit_text = " mph";
    precipitation_unit_text = " in";
  } else {
    elements.temp_unit_button_text.textContent = "C";
    is_metric = true;
    wind_unit_text = " kmh";
    precipitation_unit_text = " mm";
  }
  update_all_widgets();
});

elements.temp_graph_button.addEventListener("click", () => {
  selected_type = "temp";
  update_all_widgets();
});

elements.prec_graph_button.addEventListener("click", () => {
  selected_type = "prec";
  update_all_widgets();
});

// SEARCHBAR

elements.searchbar.addEventListener("input", async (event) => {
  const input = event.target.value.trim();

  elements.search_results_wrapper.innerHTML = "";

  elements.search_results_wrapper.classList.add("hide");

  if (input.length < 2) {
    return;
  }

  elements.search_results_wrapper.classList.remove("hide");
  elements.search_results_wrapper.append(
    elements.loading_image_template.content.cloneNode(true).children[0],
  );

  controller?.abort();
  controller = new AbortController();

  try {
    cities = await fetch_and_validate(
      `https://geocoding-api.open-meteo.com/v1/search` +
        `?name=${encodeURIComponent(input)}` +
        `&count=10` +
        `&language=en` +
        `&format=json`,
      controller.signal,
    );

    for (const city of cities.results ?? []) {
      elements.search_results_wrapper.querySelector(".loading-image")?.remove();

      const result_card =
        elements.search_result_template.content.cloneNode(true).children[0];

      location_name = get_city_name(city);

      result_card.addEventListener("click", () => {
        update_weather_data(city.latitude, city.longitude).then(() => {
          update_all_widgets();
        });
        location_name = get_city_name(city);

        elements.search_results_wrapper.innerHTML = "";
        elements.search_results_wrapper.classList.add("hide");
        elements.searchbar.reset();
      });

      const city_name_text = result_card.querySelector(".city-name");

      city_name_text.textContent = location_name;
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
    update_weather_data(city.latitude, city.longitude).then(() => {
      update_all_widgets();
    });
    location_name = get_city_name(city);

    elements.search_results_wrapper.innerHTML = "";
    elements.search_results_wrapper.classList.add("hide");
    elements.searchbar.reset();
  }
});

// DOM MANIPULATION

async function update_weather_data(lat, long) {
  weather_data_metric = await get_weather(lat, long);

  weather_data_imperial = metric_to_imperial(
    structuredClone(weather_data_metric),
  );
}

function update_all_widgets() {
  if (is_metric) {
    update_main_widget(weather_data_metric.current);
    update_day_widgets(weather_data_metric.daily);
    update_graph(weather_data_metric.hourly);
  } else {
    update_main_widget(weather_data_imperial.current);
    update_day_widgets(weather_data_imperial.daily);
    update_graph(weather_data_imperial.hourly);
  }
}

function update_main_widget(weather_data) {
  elements.main_location.textContent = location_name;

  elements.main_temp.textContent =
    Math.round(Number(weather_data.temperature_2m)) + "°";

  elements.main_feels_temp.textContent =
    Math.round(Number(weather_data.apparent_temperature)) + "°";

  elements.main_precipitation.textContent =
    Number(weather_data.precipitation).toFixed(1) + precipitation_unit_text;

  elements.main_humidity.textContent = weather_data.relative_humidity_2m + "%";

  elements.main_wind.textContent =
    Math.round(Number(weather_data.wind_speed_10m)) + wind_unit_text;

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

function update_graph(weather_data) {
  const data = get_hourly_data_from_day(
    weather_data,
    selected_day,
    selected_type,
  );

  switch (selected_type) {
    case "temp":
      const max = Math.max(...data);
      const min = Math.min(...data);
      const dif = max - min + 10;
      elements.bars.forEach((bar, index) => {
        bar.style.height = `${Math.round(((data[index] - (min - 5)) / dif) * 100)}%`;
      });

      elements.legend_100.textContent = Math.round(max) + "°";
      elements.legend_75.textContent =
        Math.round((max - min) * 0.75 + min) + "°";
      elements.legend_50.textContent =
        Math.round((max - min) * 0.5 + min) + "°";
      elements.legend_25.textContent =
        Math.round((max - min) * 0.25 + min) + "°";
      elements.legend_0.textContent = Math.round(Math.min(...data)) + "°";
  }
}

// FETCH

async function fetch_and_validate(url, signal) {
  const response = await fetch(url, { signal: signal });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  return await response.json();
}

async function get_weather(lat, long) {
  const weather_data = await fetch_and_validate(
    `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${encodeURIComponent(lat)}` +
      `&longitude=${encodeURIComponent(long)}` +
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
      `&hourly=` +
      `temperature_2m,` +
      `precipitation`,
  );

  console.log(weather_data);

  return weather_data;
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
    "New Hampshire": "NH",
    "New Jersey": "NJ",
    "New Mexico": "NM",
    "New York": "NY",
    "North Carolina": "NC",
    "North Dakota": "ND",
    Ohio: "OH",
    Oklahoma: "OK",
    Oregon: "OR",
    Pennsylvania: "PA",
    "Rhode Island": "RI",
    "South Carolina": "SC",
    "South Dakota": "SD",
    Tennessee: "TN",
    Texas: "TX",
    Utah: "UT",
    Vermont: "VT",
    Virginia: "VA",
    Washington: "WA",
    "West Virginia": "WV",
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

function get_city_name(city) {
  if (city.country === "United States") {
    return city.name + ", " + abbreviate_state(city.admin1);
  } else {
    return city.name + ", " + city.country;
  }
}

// not really a transformer but whatever
function get_hourly_data_from_day(weather_data, day, hourly_type) {
  // No enums? f*** it, i'm using a string...
  const start = day * 7;
  const end = day * 7 + 24;
  switch (hourly_type) {
    case "temp":
      return weather_data.temperature_2m.slice(start, end);
      break;
    case "prec":
      return weather_data.precipitation.slice(start, end);
      break;
  }
}

function metric_to_imperial(weather_data) {
  // CURRENT
  weather_data.current.temperature_2m = c_to_f(
    weather_data.current.temperature_2m,
  );
  weather_data.current.apparent_temperature = c_to_f(
    weather_data.current.apparent_temperature,
  );
  weather_data.current.wind_speed_10m = kmh_to_mph(
    weather_data.current.wind_speed_10m,
  );
  weather_data.current.precipitation = mm_to_in(
    weather_data.current.precipitation,
  );

  // DAILY
  weather_data.daily.temperature_2m_max =
    weather_data.daily.temperature_2m_max.map(c_to_f);

  weather_data.daily.temperature_2m_min =
    weather_data.daily.temperature_2m_min.map(c_to_f);

  // JOURLY
  weather_data.hourly.temperature_2m =
    weather_data.hourly.temperature_2m.map(c_to_f);

  weather_data.hourly.precipitation = mm_to_in(
    weather_data.hourly.precipitation,
  );

  return weather_data;
}

function kmh_to_mph(kmh) {
  return kmh / 1.609344;
}

function c_to_f(c) {
  return c * (9 / 5) + 32;
}

function mm_to_in(mm) {
  return mm / 25.4;
}
