"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import "./scan.css";

export default function ScanPage() {
  const scannerRef = useRef(null);

  const [result, setResult] = useState("");
  const [location, setLocation] = useState(null);
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState("");

  const fetchWeather = async (lat, lon) => {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&timezone=auto&wind_speed_unit=ms`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch weather");
    }

    const data = await response.json();
    const current = data.current || {};

    return {
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      time: current.time,
      temperature: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      feelsLike: current.apparent_temperature,
      precipitation: current.precipitation,
      weatherCode: current.weather_code,
      windSpeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
    };
  };

  useEffect(() => {
    const scanner = new Html5Qrcode("qr-reader");

    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 250,
          },
        },
        async (decodedText) => {
          try {
            await scanner.stop();
          } catch (err) {
            console.log(err);
          }

          setResult(decodedText);
          setError("");

          if (!navigator.geolocation) {
            setError("Location is not supported by this browser.");
            return;
          }

          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const latitude = position.coords.latitude;
              const longitude = position.coords.longitude;

              setLocation({
                latitude,
                longitude,
              });

              try {
                const weatherData = await fetchWeather(
                  latitude,
                  longitude
                );

                setWeather(weatherData);
              } catch (err) {
                setError("Unable to fetch weather.");
              }

              const scanData = {
                qrData: decodedText,
                latitude,
                longitude,
                timestamp: new Date().toISOString(),
              };

              console.log(scanData);
            },
            () => {
              setError("Please allow location access.");
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            }
          );
        },
        () => {}
      )
      .catch(() => {
        setError("Unable to access camera.");
      });

    return () => {
      if (scanner.isScanning) {
        scanner.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <main className="scan-page">
      <div className="scan-card">
        <h1>Scan QR Code</h1>

        {!result && (
          <>
            <p>Point your camera at a QR code</p>
            <div id="qr-reader" />
          </>
        )}

        {result && (
          <div className="result">
            <strong>QR Scanned</strong>
            <p>{result}</p>

            {location && (
              <div>
                <strong>Location</strong>
                <p>Latitude: {location.latitude}</p>
                <p>Longitude: {location.longitude}</p>
              </div>
            )}

            {!location && !error && (
              <p>Getting your location...</p>
            )}

            {location && !weather && !error && (
              <p>Fetching weather...</p>
            )}

            {weather && (
              <div className="weather">
                <strong>Weather</strong>

                <p>
                  Temperature:{" "}
                  <strong>{weather.temperature}°C</strong>
                </p>

                <p>
                  Humidity:{" "}
                  <strong>{weather.humidity}%</strong>
                </p>

                <p>
                  Feels Like: {weather.feelsLike}°C
                </p>

                <p>
                  Precipitation: {weather.precipitation} mm
                </p>

                <p>
                  Wind Speed: {weather.windSpeed} m/s
                </p>

                <p>
                  Wind Direction: {weather.windDirection}°
                </p>

                <p>
                  Weather Code: {weather.weatherCode}
                </p>

                <p>
                  Time: {weather.time}
                </p>

                <p>
                  Timezone: {weather.timezone}
                </p>
              </div>
            )}

            {error && (
              <p className="error">{error}</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}