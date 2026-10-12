import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000",
});

// Automatically attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API calls
export const registerUser = (data) => API.post("/auth/register", data);
export const loginUser = (data) => {
  // OAuth2 login requires form-data, not JSON
  const formData = new URLSearchParams();
  formData.append("username", data.email);
  formData.append("password", data.password);
  return API.post("/auth/login", formData);
};

// Vehicle API calls
export const getVehicles = () => API.get("/vehicles/");
export const registerVehicle = (data) => API.post("/vehicles/", data);
export const updateVehicleStatus = (id, data) => API.patch(`/vehicles/${id}/status`, data);

// Shipment tracking API calls
export const getTrips = () => API.get("/tracking/trips");
export const createTrip = (data) => API.post("/tracking/trips", data);
export const updateTripStatus = (id, status) => API.patch(`/tracking/trips/${id}/status`, { status });
export const updateTripLocation = (id, data) => API.post(`/tracking/trips/${id}/location`, data);
export const optimizeRoute = (data) => API.post("/tracking/routes/optimize", data);

export default API;


export const createTrackingWebSocket = (tripId, onMessage, onClose) => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  const ws = new WebSocket(`ws://localhost:8000/tracking/ws/${tripId}?token=${token}`);
  ws.onmessage = (event) => onMessage(JSON.parse(event.data));
  if (onClose) ws.onclose = onClose;
  return ws;
};

// Shipment API calls
export const getShipments = () => API.get("/shipments/");
export const createShipment = (data) => API.post("/shipments/", data);
export const updateShipmentStatus = (id, data) => API.patch(`/shipments/${id}/status`, data);
export const trackShipment = (trackingNumber) => API.get(`/shipments/track/${trackingNumber}`);

// Driver API calls
export const getDrivers = () => API.get("/drivers/");
export const createDriver = (data) => API.post("/drivers/", data);
export const updateDriverStatus = (id, data) => API.patch(`/drivers/${id}/status`, data);
export const assignDriverToTrip = (tripId, data) => API.post(`/drivers/trips/${tripId}/assign-driver`, data);

// Maintenance API calls
export const getMaintenance = (params) => API.get("/maintenance/", { params });
export const createMaintenance = (data) => API.post("/maintenance/", data);
export const updateMaintenanceStatus = (id, data) => API.patch(`/maintenance/${id}/status`, data);
export const getMaintenanceAlerts = () => API.get("/maintenance/alerts");

// Analytics API calls
export const getFleetSummary = () => API.get("/analytics/fleet-summary");
export const getFuelReport = () => API.get("/analytics/fuel-report");
export const getTripPerformance = () => API.get("/analytics/trip-performance");
export const getMaintenanceReport = () => API.get("/analytics/maintenance-report");
