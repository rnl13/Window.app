function degreesToRadians(value: number) {
  return value * Math.PI / 180;
}

function radiansToDegrees(value: number) {
  return value * 180 / Math.PI;
}

function normaliseDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

// NOAA's solar-position approximation. The -0.833° threshold accounts for
// normal refraction and the apparent radius of the sun at sunrise/sunset.
export function isDaylightAt(time: string, latitude: number, longitude: number) {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return false;

  const julianDay = date.getTime() / 86_400_000 + 2_440_587.5;
  const centuries = (julianDay - 2_451_545) / 36_525;
  const meanLongitude = normaliseDegrees(280.46646 + centuries * (36_000.76983 + 0.0003032 * centuries));
  const meanAnomaly = 357.52911 + centuries * (35_999.05029 - 0.0001537 * centuries);
  const eccentricity = 0.016708634 - centuries * (0.000042037 + 0.0000001267 * centuries);
  const anomalyRadians = degreesToRadians(meanAnomaly);
  const equationCenter =
    Math.sin(anomalyRadians) * (1.914602 - centuries * (0.004817 + 0.000014 * centuries)) +
    Math.sin(2 * anomalyRadians) * (0.019993 - 0.000101 * centuries) +
    Math.sin(3 * anomalyRadians) * 0.000289;
  const trueLongitude = meanLongitude + equationCenter;
  const omega = 125.04 - 1934.136 * centuries;
  const apparentLongitude = trueLongitude - 0.00569 - 0.00478 * Math.sin(degreesToRadians(omega));
  const meanObliquity = 23 + (26 + ((21.448 - centuries * (46.815 + centuries * (0.00059 - 0.001813 * centuries))) / 60)) / 60;
  const obliquity = meanObliquity + 0.00256 * Math.cos(degreesToRadians(omega));
  const declination = Math.asin(Math.sin(degreesToRadians(obliquity)) * Math.sin(degreesToRadians(apparentLongitude)));
  const y = Math.tan(degreesToRadians(obliquity) / 2) ** 2;
  const equationOfTime = 4 * radiansToDegrees(
    y * Math.sin(2 * degreesToRadians(meanLongitude)) -
      2 * eccentricity * Math.sin(anomalyRadians) +
      4 * eccentricity * y * Math.sin(anomalyRadians) * Math.cos(2 * degreesToRadians(meanLongitude)) -
      0.5 * y * y * Math.sin(4 * degreesToRadians(meanLongitude)) -
      1.25 * eccentricity * eccentricity * Math.sin(2 * anomalyRadians),
  );
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const solarMinutes = normaliseDegrees((utcMinutes + equationOfTime + 4 * longitude) / 4) * 4;
  const hourAngle = degreesToRadians(solarMinutes / 4 - 180);
  const latitudeRadians = degreesToRadians(latitude);
  const elevation = Math.asin(
    Math.sin(latitudeRadians) * Math.sin(declination) +
      Math.cos(latitudeRadians) * Math.cos(declination) * Math.cos(hourAngle),
  );

  return radiansToDegrees(elevation) >= -0.833;
}
