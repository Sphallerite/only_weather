const temp = document.querySelector(".temp");
const feels = document.querySelector(".feels-temp");
const perc = document.querySelector("#perc");
const humidity = document.querySelector("#humidity");
const wind = document.querySelector("#wind");

const unit_button = document.getElementById("unit-button");
const text = unit_button.querySelector(".button-text");

const data = await fetch(
  "https://api.open-meteo.com/v1/forecast" +
    "?latitude=33.6347" +
    "&longitude=-117.6043" +
    "&current=temperature_2m," +
    "apparent_temperature," +
    "precipitation," +
    "weather_code," +
    "relative_humidity_2m," +
    "wind_speed_10m" +
    "&wind_speed_unit=mph" +
    "&temperature_unit=fahrenheit" +
    "&precipitation_unit=inch",
).then((response) => response.json());

console.log(data);

temp.textContent = Math.round(Number(data.current.temperature_2m)) + "°";
feels.textContent = Math.round(Number(data.current.apparent_temperature)) + "°";

perc.textContent = Math.round(Number(data.current.precipitation)) + "%";
humidity.textContent = data.current.relative_humidity_2m + "%";
wind.textContent = data.current.wind_speed_10m + " mph";

unit_button.addEventListener("click", () => {
  if (text.textContent === "F") {
    text.textContent = "C";
  } else {
    text.textContent = "F";
  }
});
