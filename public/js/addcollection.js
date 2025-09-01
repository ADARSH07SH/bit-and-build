document.querySelector("form").addEventListener("submit", function (event) {
  const type = document.getElementById("type").value;
  const color = document.getElementById("color").value;
  const googleImageLink = document.getElementById("googleImageLink").value;

  console.log("Form Values:", { type, color, googleImageLink });

 
  if (!type || !color || !googleImageLink) {
    event.preventDefault(); 
    alert("All fields are required.");
  }
});
