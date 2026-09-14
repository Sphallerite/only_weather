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
  bar_box_temp_label: document.getElementById("temp-label"),

  temp_graph_button: document.getElementById("temperature-graph-menu-button"),
  prec_graph_button: document.getElementById("precipitation-graph-menu-button"),

  legend_100: document.getElementById("legend-text-100"),
  legend_75: document.getElementById("legend-text-75"),
  legend_50: document.getElementById("legend-text-50"),
  legend_25: document.getElementById("legend-text-25"),
  legend_0: document.getElementById("legend-text-0"),
};

// CONSTANTS
const default_city = "Rancho Santa Margarita, California";

// These factors determine how much to scale graph bars from the top
// and bottom of the graph. 0.0 and 1.0 means the lowest or highest value in
// the group will be at 0% or 100% bar height respectivly.
// i.e. precipitation of 0.0 mm should be at 0% height, whereas the low
// daily temp of 12 degrees should not scale to 0% bar height, and should
// scale to some factor such as 10% bar height
const TempSquishFactors = {
  top: 0.1,
  bottom: 0.1,
};

const PrecSquishFactors = {
  top: 0.5,
  bottom: 0.0,
};

let SiteState = {
  display_metric: false,
  current_location: default_city,
};

let WeatherData = {
  metric: null,
  imperial: null,
};

let SearchData = {
  controller: null,
  cities: null,
};

let GraphData = {
  day_selected: 0,
  type_selected: "temp",
};

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

SiteState.current_location = get_city_name(city);

// EVENT LISTENERS

// BUTTONS

elements.temp_unit_button.addEventListener("click", () => {
  if (SiteState.display_metric) {
    elements.temp_unit_button_text.textContent = "F";
    SiteState.display_metric = false;
  } else {
    elements.temp_unit_button_text.textContent = "C";
    SiteState.display_metric = true;
  }
  update_all_widgets();
});

elements.temp_graph_button.addEventListener("click", () => {
  GraphData.type_selected = "temp";
  update_all_widgets();
});

elements.prec_graph_button.addEventListener("click", () => {
  GraphData.type_selected = "prec";
  update_all_widgets();
});

elements.days.forEach((day, index) => {
  day.addEventListener("click", () => {
    GraphData.day_selected = index;
    update_all_widgets();
  });
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

  SearchData.controller?.abort();
  SearchData.controller = new AbortController();

  try {
    SearchData.cities = await fetch_and_validate(
      `https://geocoding-api.open-meteo.com/v1/search` +
        `?name=${encodeURIComponent(input)}` +
        `&count=10` +
        `&language=en` +
        `&format=json`,
      SearchData.controller.signal,
    );

    for (const city of SearchData.cities.results ?? []) {
      elements.search_results_wrapper.querySelector(".loading-image")?.remove();

      const result_card = elements.search_result_template.content.cloneNode(true).children[0];

      SiteState.current_location = get_city_name(city);

      result_card.addEventListener("click", () => {
        update_weather_data(city.latitude, city.longitude).then(() => {
          update_all_widgets();
        });
        SiteState.current_location = get_city_name(city);

        elements.search_results_wrapper.innerHTML = "";
        elements.search_results_wrapper.classList.add("hide");
        elements.searchbar.reset();
      });

      const city_name_text = result_card.querySelector(".city-name");

      city_name_text.textContent = SiteState.current_location;
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

  if (SearchData.cities != null) {
    const city = SearchData.cities.results[0];
    update_weather_data(city.latitude, city.longitude).then(() => {
      update_all_widgets();
    });
    SiteState.current_location = get_city_name(city);

    elements.search_results_wrapper.innerHTML = "";
    elements.search_results_wrapper.classList.add("hide");
    elements.searchbar.reset();
  }
});

// GRAPH BARS

elements.bars.forEach((bar, index) => {
  bar.addEventListener("mouseenter", () => {
    let weather_data = SiteState.display_metric
      ? WeatherData.metric.hourly
      : WeatherData.imperial.hourly;

    elements.bar_box_temp_label.textContent =
      get_hourly_data_from_day(weather_data, GraphData.day_selected, "temp")[index].toFixed(0) +
      "°";

    elements.bar_box_temp_label.classList.remove("hide");
  });

  bar.addEventListener("mouseleave", () => {
    elements.bar_box_temp_label.classList.add("hide");
  });
});

// DOM MANIPULATION

async function update_weather_data(lat, long) {
  WeatherData.metric = await get_weather(lat, long);

  WeatherData.imperial = metric_to_imperial(structuredClone(WeatherData.metric));
}

function update_all_widgets() {
  if (SiteState.display_metric) {
    update_main_widget(WeatherData.metric.current);
    update_day_widgets(WeatherData.metric.daily);
    update_graph(WeatherData.metric.hourly);
  } else {
    update_main_widget(WeatherData.imperial.current);
    update_day_widgets(WeatherData.imperial.daily);
    update_graph(WeatherData.imperial.hourly);
  }
}

function update_main_widget(weather_data) {
  elements.main_location.textContent = SiteState.current_location;

  elements.main_temp.textContent = Number(weather_data.temperature_2m).toFixed(0) + "°";

  elements.main_feels_temp.textContent = Number(weather_data.apparent_temperature).toFixed(0) + "°";

  elements.main_precipitation.textContent =
    Number(weather_data.precipitation).toFixed(1) + SiteState.display_metric ? " mm" : " in";

  elements.main_humidity.textContent = weather_data.relative_humidity_2m + "%";

  elements.main_wind.textContent =
    Number(weather_data.wind_speed_10m).toFixed(0) + SiteState.display_metric ? " kmh" : " mph";

  elements.main_emoji.src = weather_code_to_emoji(weather_data.weather_code, weather_data.is_day);
}

function update_day_widgets(weather_data) {
  for (let i = 0; i < 7; i++) {
    const day = elements.days[i];

    day.querySelector(".day-date").textContent = iso_to_date(weather_data.time[i]);

    day.querySelector(".day-icon").src = weather_code_to_emoji(
      weather_data.weather_code[i],
      true, // Daily emoji should always be day version
    );
    day.querySelector(".hi").textContent =
      Number(weather_data.temperature_2m_max[i]).toFixed(0) + "°H";
    day.querySelector(".lo").textContent =
      Number(weather_data.temperature_2m_min[i]).toFixed(0) + "°L";
  }

  elements.days[0].querySelector(".day-date").textContent = "Today";
}

function update_graph(weather_data) {
  const data = get_hourly_data_from_day(
    weather_data,
    GraphData.day_selected,
    GraphData.type_selected,
  );

  let Context = get_graph_context(GraphData.type_selected);

  const max = Math.max(...data);
  const min = Math.min(...data);

  const max_squished = max + max * Context.squish.top;
  const min_squished = min - min * Context.squish.bottom;
  const squished_dif = max_squished - min_squished + 0.001;

  elements.bars.forEach((bar, index) => {
    const percent = ((data[index] - min_squished) / squished_dif) * 100;
    bar.style.height = `${percent}%`;
  });

  const percent_100 = clean_number(max_squished.toFixed(Context.round_to));
  const percent_75 = clean_number((squished_dif * 0.75 + min_squished).toFixed(Context.round_to));
  const percent_50 = clean_number((squished_dif * 0.5 + min_squished).toFixed(Context.round_to));
  const percent_25 = clean_number((squished_dif * 0.25 + min_squished).toFixed(Context.round_to));
  const percent_0 = clean_number(min_squished.toFixed(Context.round_to));

  elements.legend_100.textContent = percent_100 + Context.unit_text;
  elements.legend_75.textContent = percent_75 + Context.unit_text;
  elements.legend_50.textContent = percent_50 + Context.unit_text;
  elements.legend_25.textContent = percent_25 + Context.unit_text;
  elements.legend_0.textContent = percent_0 + Context.unit_text;
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

function get_hourly_data_from_day(weather_data, day, hourly_type) {
  // No enums? f*** it, i'm using a string...
  const start = day * 24;
  const end = day * 24 + 24;
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
  weather_data.current.temperature_2m = c_to_f(weather_data.current.temperature_2m);
  weather_data.current.apparent_temperature = c_to_f(weather_data.current.apparent_temperature);
  weather_data.current.wind_speed_10m = kmh_to_mph(weather_data.current.wind_speed_10m);
  weather_data.current.precipitation = mm_to_in(weather_data.current.precipitation);

  // DAILY
  weather_data.daily.temperature_2m_max = weather_data.daily.temperature_2m_max.map(c_to_f);

  weather_data.daily.temperature_2m_min = weather_data.daily.temperature_2m_min.map(c_to_f);

  // JOURLY
  weather_data.hourly.temperature_2m = weather_data.hourly.temperature_2m.map(c_to_f);

  weather_data.hourly.precipitation = weather_data.hourly.precipitation.map(mm_to_in);

  return weather_data;
}

function get_graph_context(type) {
  switch (type) {
    case "temp": {
      return {
        squish: TempSquishFactors,
        unit_text: "°",
        round_to: 0,
      };
    }
    case "prec": {
      return {
        squish: PrecSquishFactors,
        unit_text: SiteState.display_metric ? " mm" : " in",
        round_to: SiteState.display_metric ? 1 : 2,
      };
    }
  }
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

function clean_number(num) {
  return Number(String(num));
}
