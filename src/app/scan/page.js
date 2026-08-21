"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import "./scan.css";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://5000-kode-ws-f9fbf17f0.hebbale.academy";

export default function ScanPage() {
  const scannerRef = useRef(null);

  const [scanPlace, setScanPlace] = useState("farm");
  const [result, setResult] = useState("");
  const [location, setLocation] = useState(null);
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [canScanAgain, setCanScanAgain] = useState(false);

  const playScanBeep = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) {
      return;
    }

    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gain.gain.setValueAtTime(0.18, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.18);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.18);
    oscillator.onended = () => audioContext.close();
  };

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

  const saveScan = async (scanData) => {
    setSaveStatus("Saving scan...");

    try {
      const response = await fetch(`${API_BASE_URL}/api/qr-scans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scanData),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || data.message || "Unable to save scan");
      }

      setSaveStatus("Scan saved");
      return data;
    } catch (err) {
      console.error(err);
      setSaveStatus("Scan save failed");
      setError("Scan saved locally, but could not reach backend.");
      return null;
    }
  };

  const startScanner = useCallback(() => {
    const scanner = scannerRef.current;
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

          playScanBeep();
          setResult(decodedText);
          setError("");
          setCanScanAgain(false);

          const scannedAt = new Date().toISOString();
          const roomId = scanPlace === "warehouse" ? "ROOM-02" : "ROOM-01";

          if (!navigator.geolocation) {
            setError("Location is not supported by this browser.");
            await saveScan({
              qrData: decodedText,
              scanPlace,
              room_id: roomId,
              room_type: scanPlace,
              scanned_at: scannedAt,
            });
            setCanScanAgain(true);
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

              let weatherData = null;

              try {
                weatherData = await fetchWeather(latitude, longitude);
                setWeather(weatherData);
              } catch (err) {
                setError("Unable to fetch weather.");
              }

              const scanData = {
                qrData: decodedText,
                scanPlace,
                room_id: roomId,
                room_type: scanPlace,
                latitude,
                longitude,
                temperature: weatherData?.temperature,
                humidity: weatherData?.humidity,
                precipitation: weatherData?.precipitation,
                scanned_at: scannedAt,
              };

              await saveScan(scanData);
              setCanScanAgain(true);
            },
            async () => {
              setError("Please allow location access.");
              await saveScan({
                qrData: decodedText,
                scanPlace,
                room_id: roomId,
                room_type: scanPlace,
                scanned_at: scannedAt,
              });
              setCanScanAgain(true);
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
  }, [scanPlace]);

  const handleScanAgain = () => {
    setResult("");
    setLocation(null);
    setWeather(null);
    setError("");
    setSaveStatus("");
    setCanScanAgain(false);

    setTimeout(() => {
      startScanner();
    }, 0);
  };

  useEffect(() => {
    const scanner = new Html5Qrcode("qr-reader");

    scannerRef.current = scanner;
    startScanner();

    return () => {
      if (scanner.isScanning) {
        scanner.stop().catch(() => {});
      }
    };
  }, [scanPlace, startScanner]);

  return (
    <main className="scan-page">
      <div className="scan-card">
        <div className="scan-header">
          <h1>Scan QR Code</h1>

          <label className="scan-place">
            <span>Type</span>
            <select
              value={scanPlace}
              onChange={(event) => setScanPlace(event.target.value)}
              disabled={Boolean(result)}
            >
              <option value="farm">Farm</option>
              <option value="warehouse">Warehouse</option>
            </select>
          </label>
        </div>

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

            {saveStatus && (
              <p className="save-status">{saveStatus}</p>
            )}

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

            {canScanAgain && (
              <button
                className="scan-again-button"
                type="button"
                onClick={handleScanAgain}
              >
                Scan again
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
