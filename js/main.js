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
  bar_box_label: document.getElementById("temp-label"),

  temp_graph_button: document.getElementById("temperature-graph-menu-button"),
  prec_graph_button: document.getElementById("precipitation-graph-menu-button"),

  legend_100: document.getElementById("legend-text-100"),
  legend_66: document.getElementById("legend-text-66"),
  legend_33: document.getElementById("legend-text-33"),
  legend_0: document.getElementById("legend-text-0"),
};

// CONSTANTS
const default_city = "Rancho Santa Margarita, California";

const GraphScales = {
  metric: {
    temp: {
      min_difference: 2,
      bottom_margin: 0.1,
      top_margin: 0.1,
    },
    prec: {
      min_difference: 3,
      bottom_margin: 0.0,
      top_margin: 0.1,
    },
  },
  imperial: {
    temp: {
      min_difference: 10,
      bottom_margin: 0.1,
      top_margin: 0.1,
    },
    prec: {
      min_difference: 0.06,
      bottom_margin: 0.0,
      top_margin: 0.1,
    },
  },
};

const current_city = await get_city(default_city);

let SiteState = {
  display_metric: false,
  current_location: get_city_name(current_city),
};

let WeatherData = await (async () => {
  const metric = await get_weather(current_city.latitude, current_city.longitude);
  const imperial = metric_to_imperial(metric);

  return {
    metric: metric,
    imperial: imperial,
  };
})();

let SearchData = {
  controller: null,
  cities: null,
};

let GraphData = {
  day_selected: 0,
  type_selected: "temp",
};

update_all_widgets();

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
  bar.addEventListener("pointerenter", () => {
    let weather_data = SiteState.display_metric
      ? WeatherData.metric.hourly
      : WeatherData.imperial.hourly;

    const GraphContext = get_graph_context(GraphData.type_selected);

    let value = (elements.bar_box_label.textContent =
      clean_number(
        get_hourly_data_from_day(weather_data, GraphData.day_selected, GraphData.type_selected)[
          index
        ].toFixed(GraphContext.round_to),
      ) + GraphContext.unit_text);

    elements.bar_box_label.classList.remove("hide");
    bar.classList.add("lighter");
  });

  bar.addEventListener("pointerleave", () => {
    elements.bar_box_label.classList.add("hide");
    bar.classList.remove("lighter");
  });
});

// FETCH

async function update_weather_data(lat, long) {
  WeatherData.metric = await get_weather(lat, long);

  WeatherData.imperial = metric_to_imperial(structuredClone(WeatherData.metric));
}

// DOM MANIPULATION

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

  elements.main_temp.textContent = weather_data.temperature_2m.toFixed(0) + "°";

  elements.main_feels_temp.textContent = weather_data.apparent_temperature.toFixed(0) + "°";

  elements.main_precipitation.textContent =
    Number(weather_data.precipitation).toFixed(1) + (SiteState.display_metric ? " mm" : " in");

  elements.main_humidity.textContent = weather_data.relative_humidity_2m + "%";

  elements.main_wind.textContent =
    Number(weather_data.wind_speed_10m).toFixed(0) + (SiteState.display_metric ? " kmh" : " mph");

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
  const dif = max - min;

  const graph_bottom = min - min * Context.scale.bottom_margin;
  let graph_top = max + max * Context.scale.top_margin;
  graph_top = graph_top < Context.scale.min_difference ? Context.scale.min_difference : graph_top;
  const graph_height = graph_top - graph_bottom;

  elements.bars.forEach((bar, index) => {
    const bar_height_percentage =
      ((data[index].toFixed(Context.round_to) - graph_bottom) / graph_height) * 100;
    bar.style.height = `${bar_height_percentage}%`;

    if (GraphData.day_selected == 0 && index < new Date().getHours()) {
      bar.classList.add("current-time-highlighted");
    } else {
      bar.classList.remove("current-time-highlighted");
    }
  });

  const percent_100 = clean_number(graph_top.toFixed(Context.round_to));
  const percent_66 = clean_number((graph_height * 0.666 + graph_bottom).toFixed(Context.round_to));
  const percent_33 = clean_number((graph_height * 0.333 + graph_bottom).toFixed(Context.round_to));
  const percent_0 = clean_number(graph_bottom.toFixed(Context.round_to));

  elements.legend_100.textContent = percent_100 + Context.unit_text;
  elements.legend_66.textContent = percent_66 + Context.unit_text;
  elements.legend_33.textContent = percent_33 + Context.unit_text;
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

async function get_cities(city) {
  let cities = await fetch_and_validate(
    `https://geocoding-api.open-meteo.com/v1/search` +
      `?name=${encodeURIComponent(city)}` +
      `&count=1` +
      `&language=en` +
      `&format=json`,
  );

  return cities;
}

async function get_city(city) {
  const result = await get_cities(city);
  return result.results[0];
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
  weather_data = structuredClone(weather_data);

  // CURRENT
  weather_data.current.temperature_2m = c_to_f(weather_data.current.temperature_2m);
  weather_data.current.apparent_temperature = c_to_f(weather_data.current.apparent_temperature);
  weather_data.current.wind_speed_10m = kmh_to_mph(weather_data.current.wind_speed_10m);
  weather_data.current.precipitation = mm_to_in(weather_data.current.precipitation);

  // DAILY
  weather_data.daily.temperature_2m_max = weather_data.daily.temperature_2m_max.map(c_to_f);

  weather_data.daily.temperature_2m_min = weather_data.daily.temperature_2m_min.map(c_to_f);

  // HOURLY
  weather_data.hourly.temperature_2m = weather_data.hourly.temperature_2m.map(c_to_f);

  weather_data.hourly.precipitation = weather_data.hourly.precipitation.map(mm_to_in);

  return weather_data;
}

function get_graph_context(type) {
  switch (type) {
    case "temp": {
      return {
        scale: SiteState.display_metric ? GraphScales.metric.temp : GraphScales.imperial.temp,
        unit_text: "°",
        round_to: 0,
      };
    }
    case "prec": {
      return {
        scale: SiteState.display_metric ? GraphScales.metric.prec : GraphScales.imperial.prec,
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
