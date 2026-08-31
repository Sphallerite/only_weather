const elements = {
  tempUnitButton: document.getElementById("temp-unit-button"),
  tempUnitButtonText: document.getElementById("temp-unit-button-text"),
  searchbar: document.getElementById("searchbar"),
  location: document.getElementById("location"),
  mainLocation: document.getElementById("main-location"),
  mainDate: document.getElementById("main-date"),
  mainTemp: document.getElementById("main-temp"),
  mainfeelsTemp: document.getElementById("feels-temp"),
  mainEmoji: document.getElementById("main-emoji"),
  mainPrecipitation: document.getElementById("main-percipitation"),
  mainHumidity: document.getElementById("main-humidity"),
  mainWind: document.getElementById("main-wind"),

  days: Array.from(document.querySelectorAll(".day")),
};

const city = "Milford, Massachusetts";

const location = city_to_coords(city);

location.then((locations) => {
  return get_weather(
    locations.results[0].latitude,
    locations.results[0].longitude,
  ).then((weather_data) => {
    update_main_widget(
      weather_data.current,
      locations.results[0].name +
        ", " +
        abbreviate_state(locations.results[0].admin1),
    );
    update_day_widgets(weather_data.daily);
  });
});

elements.tempUnitButton.addEventListener("click", () => {
  if (elements.tempUnitButtonText.textContent === "F") {
    elements.tempUnitButtonText.textContent = "C";
  } else {
    elements.tempUnitButtonText.textContent = "F";
  }
});

function update_main_widget(weather_data, location_name) {
  elements.mainLocation.textContent = location_name;

  elements.mainTemp.textContent =
    Math.round(Number(weather_data.temperature_2m)) + "°";
  elements.mainfeelsTemp.textContent =
    Math.round(Number(weather_data.apparent_temperature)) + "°";

  elements.mainPrecipitation.textContent =
    Math.round(Number(weather_data.precipitation)) + "%";
  elements.mainHumidity.textContent = weather_data.relative_humidity_2m + "%";
  elements.mainWind.textContent =
    Math.round(Number(weather_data.wind_speed_10m)) + " mph";
  elements.mainEmoji.src = weather_code_to_emoji(
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
      true,
    );
    day.querySelector(".hi").textContent =
      Math.round(Number(weather_data.temperature_2m_max[i])) + "°H";
    day.querySelector(".lo").textContent =
      Math.round(Number(weather_data.temperature_2m_min[i])) + "°L";
  }
}

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

async function city_to_coords(city) {
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search` +
      `?name=${city}` +
      `&count=10` +
      `&language=en` +
      `&format=json`,
  );
  return response.json();
}

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
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const segs = iso_date.split("-");
  return names[new Date(iso_date).getDay()] + " " + String(Number(segs[2]));
}
