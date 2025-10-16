// =========================================================
// Application Entry Point
// ---------------------------------------------------------
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    console.log("Starter website initialized.");

    // Placeholder: update footer year
    var yearElement = document.getElementById("current-year");
    if (yearElement) {
      yearElement.textContent = new Date().getFullYear();
    }
  });
})();
