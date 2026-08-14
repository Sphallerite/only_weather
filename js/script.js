const unit_button = document.getElementById("unit-button");

unit_button.addEventListener("click", () => {
  const text = unit_button.querySelector(".button-text");
  if (text.textContent == "F") {
    text.textContent = "C";
  } else {
    text.textContent = "F";
  }
});
