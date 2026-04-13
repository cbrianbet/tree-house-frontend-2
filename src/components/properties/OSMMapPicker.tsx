"use client";

import React, { useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap, useMapEvents } from "react-leaflet";

type SearchResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
}) {
  const map = useMap();
  map.setView([lat, lng], map.getZoom(), { animate: true });
  return null;
}

export default function OSMMapPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const center = useMemo<[number, number]>(() => [latitude, longitude], [latitude, longitude]);

  async function searchPlaces() {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      // Bias results to Nairobi first, then Kenya-wide.
      const attempts = [
        `${q}, Nairobi, Kenya`,
        `${q}, Kenya`,
        q,
      ];
      let found: SearchResult[] = [];
      for (const attempt of attempts) {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(attempt)}&limit=6&countrycodes=ke&addressdetails=1`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) continue;
        const data = (await res.json()) as SearchResult[];
        if (data.length > 0) {
          found = data;
          break;
        }
      }
      setResults(found);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }
    setLocationError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setLocationError("Could not retrieve your location. Please allow location access.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void searchPlaces();
            }
          }}
          placeholder="Search place or address"
          className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-800 outline-none focus:border-brand-300"
        />
        <button
          type="button"
          onClick={() => void searchPlaces()}
          className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm font-medium text-[#3D3D3D]"
        >
          {searching ? "..." : "Search"}
        </button>
        <button
          type="button"
          onClick={useMyLocation}
          className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm font-medium text-[#3D3D3D]"
        >
          {locating ? "Locating..." : "Use my location"}
        </button>
      </div>
      {locationError ? <p className="text-xs text-[#A32D2D]">{locationError}</p> : null}

      {results.length > 0 ? (
        <div className="max-h-36 overflow-auto rounded-lg border border-gray-200 bg-white">
          {results.map((r) => (
            <button
              key={r.place_id}
              type="button"
              onClick={() => {
                onChange(Number(r.lat), Number(r.lon));
                setResults([]);
              }}
              className="block w-full border-b border-gray-100 px-3 py-2 text-left text-xs text-gray-700 last:border-b-0 hover:bg-gray-50"
            >
              {r.display_name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-black/10">
        <MapContainer center={center} zoom={13} style={{ height: 300, width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Recenter lat={latitude} lng={longitude} />
          <ClickHandler onPick={onChange} />
          <CircleMarker center={[latitude, longitude]} radius={8} pathOptions={{ color: "#0F6E56", fillColor: "#1D9E75", fillOpacity: 0.8 }} />
        </MapContainer>
      </div>
      <p className="text-xs text-gray-500">
        Click the map or search to pick coordinates. Selected: {latitude.toFixed(5)}, {longitude.toFixed(5)}
      </p>
    </div>
  );
}
