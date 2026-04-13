"use client";

import React, { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import { latLngBounds } from "leaflet";
import type { NeighborhoodInsight } from "@/types/api";

function FitToPoints({
  points,
}: {
  points: Array<{ lat: number; lng: number }>;
}) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14, { animate: true });
      return;
    }
    const bounds = latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [28, 28] });
  }, [map, points]);

  return null;
}

export default function InsightsMap({
  propertyLat,
  propertyLng,
  propertyName,
  insights,
}: {
  propertyLat: number;
  propertyLng: number;
  propertyName: string;
  insights: NeighborhoodInsight[];
}) {
  const insightPoints = useMemo(
    () =>
      insights
        .map((ins) => ({
          id: ins.id,
          lat: Number(ins.lat),
          lng: Number(ins.lng),
          label: ins.name || ins.notes || ins.insight_type,
          type: ins.insight_type,
        }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)),
    [insights],
  );

  const allPoints = useMemo(
    () => [{ lat: propertyLat, lng: propertyLng }, ...insightPoints.map((p) => ({ lat: p.lat, lng: p.lng }))],
    [propertyLat, propertyLng, insightPoints],
  );

  return (
    <div className="h-full w-full">
      <MapContainer
        center={[propertyLat, propertyLng]}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToPoints points={allPoints} />

        <CircleMarker
          center={[propertyLat, propertyLng]}
          radius={8}
          pathOptions={{ color: "#0F6E56", fillColor: "#1D9E75", fillOpacity: 0.9 }}
        >
          <Tooltip permanent direction="top" offset={[0, -8]}>
            {propertyName}
          </Tooltip>
        </CircleMarker>

        {insightPoints.map((point) => (
          <CircleMarker
            key={point.id}
            center={[point.lat, point.lng]}
            radius={6}
            pathOptions={{
              color:
                point.type === "transit"
                  ? "#0C447C"
                  : point.type === "safety"
                    ? "#1D9E75"
                    : "#EF9F27",
              fillColor:
                point.type === "transit"
                  ? "#0C447C"
                  : point.type === "safety"
                    ? "#1D9E75"
                    : "#EF9F27",
              fillOpacity: 0.9,
            }}
          >
            <Tooltip permanent direction="top" offset={[0, -8]}>
              {point.label}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

