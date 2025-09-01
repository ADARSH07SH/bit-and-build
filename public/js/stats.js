// stats.js
const ctx = document.getElementById("usageTrendChart").getContext("2d");
const usageTrendChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"], 
    datasets: [
      {
        label: "Usage Frequency",
        data: [12, 19, 3, 5, 2, 3, 7], 
        backgroundColor: "rgba(108, 99, 255, 0.2)",
        borderColor: "rgba(108, 99, 255, 1)",
        borderWidth: 2,
        fill: true,
      },
    ],
  },
  options: {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  },
});
