import React, { useState, useEffect } from "react";
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from "@react-google-maps/api";
import { useTheme } from "../context/ThemeContext";

const containerStyle = {
  width: "100%",
  height: "100%",
  borderRadius: "12px",
};

const defaultCenter = { lat: 18.5204, lng: 73.8567 };

const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#17264a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#223561" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#142142" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#38bdf8" }, { weight: 0.8 }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0b1329" }] },
];

const lightMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#fed7aa" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#bae6fd" }] },
];

export default function GoogleMapView({ trip, liveLocation }) {
  const { isDark, theme } = useTheme();
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  });

  const [directions, setDirections] = useState(null);

  useEffect(() => {
    if (isLoaded && trip?.origin_lat && trip?.destination_lat) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: { lat: trip.origin_lat, lng: trip.origin_lng },
          destination: { lat: trip.destination_lat, lng: trip.destination_lng },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
          } else {
            console.error(`Error fetching directions: ${status}`);
          }
        }
      );
    } else {
      setDirections(null);
    }
  }, [isLoaded, trip?.id, trip?.origin_lat]);

  if (!isLoaded) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: theme.surface, color: theme.textMuted }}>
        Loading Intelligent Map...
      </div>
    );
  }

  const currentCenter = liveLocation 
    ? { lat: liveLocation.latitude, lng: liveLocation.longitude }
    : trip 
      ? { lat: trip.origin_lat, lng: trip.origin_lng }
      : defaultCenter;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={currentCenter}
      zoom={trip ? 9 : 6}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        styles: isDark ? darkMapStyles : lightMapStyles,
      }}
    >
      {directions && (
        <DirectionsRenderer 
          directions={directions} 
          options={{
            suppressMarkers: false,
            polylineOptions: { strokeColor: "#2563eb", strokeWeight: 5, strokeOpacity: 0.9 },
          }} 
        />
      )}

      {(liveLocation || trip?.current_lat) && (
        <Marker 
          position={{ 
            lat: liveLocation?.latitude || trip.current_lat, 
            lng: liveLocation?.longitude || trip.current_lng,
          }} 
          icon={{
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: "#10b981",
            fillOpacity: 1,
            strokeWeight: 3,
            strokeColor: "#ffffff",
          }}
          title="Vehicle Live Telemetry"
        />
      )}
    </GoogleMap>
  );
}
