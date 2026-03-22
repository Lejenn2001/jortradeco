import { useState, useEffect } from "react";

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
  location: string;
}

// Map weather codes to conditions and Biddie outfit descriptions
const getConditionFromCode = (code: number): { condition: string; icon: string } => {
  if (code === 0) return { condition: "Clear", icon: "☀️" };
  if (code <= 3) return { condition: "Cloudy", icon: "⛅" };
  if (code <= 48) return { condition: "Foggy", icon: "🌫️" };
  if (code <= 57) return { condition: "Drizzle", icon: "🌦️" };
  if (code <= 67) return { condition: "Rainy", icon: "🌧️" };
  if (code <= 77) return { condition: "Snowy", icon: "❄️" };
  if (code <= 82) return { condition: "Showers", icon: "🌧️" };
  if (code <= 86) return { condition: "Snow Showers", icon: "🌨️" };
  if (code >= 95) return { condition: "Thunderstorm", icon: "⛈️" };
  return { condition: "Clear", icon: "☀️" };
};

export const getBiddieOutfit = (condition: string): string => {
  switch (condition) {
    case "Clear": return "sunglasses and a cap 😎";
    case "Cloudy": return "a cozy hoodie 🧥";
    case "Foggy": return "a trench coat looking mysterious 🕵️";
    case "Drizzle":
    case "Rainy":
    case "Showers": return "rain boots and an umbrella ☂️";
    case "Snowy":
    case "Snow Showers": return "a beanie and scarf 🧣";
    case "Thunderstorm": return "full storm gear ⚡";
    default: return "looking fresh as always 🤖";
  }
};

export const useWeather = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Use NYC as default (Wall Street vibes)
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.006&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America/New_York"
        );
        const data = await res.json();
        const code = data.current?.weather_code ?? 0;
        const { condition, icon } = getConditionFromCode(code);
        setWeather({
          temp: Math.round(data.current?.temperature_2m ?? 70),
          condition,
          icon,
          location: "New York",
        });
      } catch {
        setWeather({ temp: 72, condition: "Clear", icon: "☀️", location: "New York" });
      }
      setLoading(false);
    };
    fetchWeather();
  }, []);

  return { weather, loading };
};
