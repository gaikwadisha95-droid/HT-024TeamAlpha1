export function predictCongestion(data) {
  let score = 0;

  score += data.density * 0.6;

  if (data.weather === "rain") score += 15;
  if (data.event === true) score += 20;
  if (data.accident === true) score += 30;
  if (data.peakHour === true) score += 25;

  if (score < 40) return "Low";
  if (score < 70) return "Medium";
  return "High";
}
