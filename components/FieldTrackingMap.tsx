import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon path issue in bundled builds
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

export interface MapPoint {
  id: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  type: 'VISIT' | 'ATTENDANCE';
  timestamp: string;
}

interface FieldTrackingMapProps {
  points: MapPoint[];
  center?: [number, number];
  zoom?: number;
}

export const FieldTrackingMap: React.FC<FieldTrackingMapProps> = ({
  points,
  center = [22.7533, 75.8937], // Default center: Vijay Nagar / Apollo Premier region, Indore
  zoom = 13,
}) => {
  return (
    <div className="w-full h-[400px] rounded-[2rem] overflow-hidden border border-slate-200 shadow-lg relative z-0">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} className="w-full h-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((point) => (
          <Marker key={point.id} position={[point.lat, point.lng]}>
            <Popup>
              <div className="p-1 space-y-1">
                <span
                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block ${
                    point.type === 'VISIT'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {point.type === 'VISIT' ? 'Marketing Visit' : 'Punch In Node'}
                </span>
                <h4 className="text-xs font-bold text-slate-900 m-0">{point.title}</h4>
                <p className="text-[11px] text-slate-600 m-0">{point.subtitle}</p>
                <p className="text-[9px] text-slate-400 font-mono m-0">
                  {new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
