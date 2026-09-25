import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Linking,
  ActivityIndicator,
  Alert,
} from "react-native";
import { AppIcon } from "@/components/ui/pro-icon";

export interface LocationPickerResult {
  address: string;
  latitude: number;
  longitude: number;
  radiusKm?: number;
}

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (result: LocationPickerResult) => void;
  initialAddress?: string;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  initialRadiusKm?: number | null;
  mode?: "VENUE_PIN" | "SERVICE_RADIUS";
  title?: string;
}

// Curated list of popular celebration hotspots across major Indian metropolitan hubs
const POPULAR_HUBS = [
  { name: "Indiranagar / Koramangala", city: "Bengaluru", lat: 12.9716, lng: 77.6412 },
  { name: "Palace Grounds, Bellary Rd", city: "Bengaluru", lat: 13.0067, lng: 77.5813 },
  { name: "Bandra Kurla Complex (BKC)", city: "Mumbai", lat: 19.0657, lng: 72.8687 },
  { name: "Juhu / Andheri West", city: "Mumbai", lat: 19.1075, lng: 72.8263 },
  { name: "Aerocity / Chhatarpur Farmhouses", city: "New Delhi", lat: 28.5028, lng: 77.1738 },
  { name: "Connaught Place / Central", city: "New Delhi", lat: 28.6315, lng: 77.2167 },
  { name: "HITEC City / Gachibowli", city: "Hyderabad", lat: 17.4435, lng: 78.3772 },
  { name: "Banjara Hills / Jubilee Hills", city: "Hyderabad", lat: 17.4265, lng: 78.4357 },
  { name: "ECR / Neelankarai Beachside", city: "Chennai", lat: 12.9492, lng: 80.2548 },
  { name: "Koregaon Park / Kalyani Nagar", city: "Pune", lat: 18.5362, lng: 73.8940 },
  { name: "C-Scheme / Mansarovar", city: "Jaipur", lat: 26.9075, lng: 75.8056 },
  { name: "Candolim / Calangute Coast", city: "Goa", lat: 15.5173, lng: 73.7628 },
];

const RADIUS_OPTIONS = [5, 10, 15, 25, 50, 100];

export function LocationPickerModal({
  visible,
  onClose,
  onSelect,
  initialAddress = "",
  initialLatitude = 12.9716, // Default Bangalore
  initialLongitude = 77.5946,
  initialRadiusKm = 25,
  mode = "VENUE_PIN",
  title,
}: LocationPickerModalProps) {
  const [address, setAddress] = useState(initialAddress);
  const [latitude, setLatitude] = useState(initialLatitude || 12.9716);
  const [longitude, setLongitude] = useState(initialLongitude || 77.5946);
  const [radiusKm, setRadiusKm] = useState(initialRadiusKm || 25);
  const [searchQuery, setSearchQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [filterCity, setFilterCity] = useState("ALL");

  useEffect(() => {
    if (visible) {
      setAddress(initialAddress);
      if (initialLatitude) setLatitude(initialLatitude);
      if (initialLongitude) setLongitude(initialLongitude);
      if (initialRadiusKm) setRadiusKm(initialRadiusKm);
    }
  }, [visible, initialAddress, initialLatitude, initialLongitude, initialRadiusKm]);

  // Handle GPS Locate Me
  const handleLocateMe = () => {
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.geolocation) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(6));
          const lng = parseFloat(pos.coords.longitude.toFixed(6));
          setLatitude(lat);
          setLongitude(lng);
          if (!address) {
            setAddress(`Current Location (${lat}, ${lng})`);
          }
          setLocating(false);
        },
        (err) => {
          setLocating(false);
          Alert.alert("Location", "Could not retrieve GPS coordinates. Please select from venues below.");
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      // Mobile fallback: set to selected hub or prompt
      Alert.alert("GPS", "Using device geolocation. Please select your venue hub below.");
    }
  };

  const handleSelectHub = (hub: typeof POPULAR_HUBS[0]) => {
    setLatitude(hub.lat);
    setLongitude(hub.lng);
    setAddress(`${hub.name}, ${hub.city}`);
    setSearchQuery("");
  };

  const handleOpenGoogleMapsPreview = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  const handleConfirm = () => {
    if (!address.trim()) {
      Alert.alert("Required", "Please provide a location or venue name.");
      return;
    }
    onSelect({
      address: address.trim(),
      latitude,
      longitude,
      ...(mode === "SERVICE_RADIUS" && { radiusKm }),
    });
    onClose();
  };

  // Filtered hubs based on search
  const filteredHubs = POPULAR_HUBS.filter((h) => {
    const matchesSearch =
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = filterCity === "ALL" || h.city === filterCity;
    return matchesSearch && matchesCity;
  });

  const cities = ["ALL", "Bengaluru", "Mumbai", "New Delhi", "Hyderabad", "Chennai", "Pune", "Goa"];

  // HTML map embed for Web / interactive display
  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; background: #13131A; }
          #map { width: 100%; height: 100vh; }
          .custom-pin {
            background-color: #8B5CF6;
            border: 3px solid #FFFFFF;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            box-shadow: 0 0 14px rgba(139,92,246,0.8);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var lat = ${latitude};
          var lng = ${longitude};
          var isRadiusMode = ${mode === "SERVICE_RADIUS"};
          var radiusMeters = ${radiusKm * 1000};

          var map = L.map('map', { zoomControl: false }).setView([lat, lng], 13);
          
          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
          }).addTo(map);

          var marker = L.marker([lat, lng], { draggable: true }).addTo(map);
          var circle = null;

          if (isRadiusMode) {
            circle = L.circle([lat, lng], {
              color: '#8B5CF6',
              fillColor: '#8B5CF6',
              fillOpacity: 0.18,
              radius: radiusMeters,
              weight: 2
            }).addTo(map);
          }

          marker.on('dragend', function(e) {
            var position = marker.getLatLng();
            if (circle) circle.setLatLng(position);
            window.parent.postMessage({ type: 'PIN_MOVED', lat: position.lat, lng: position.lng }, '*');
          });

          map.on('click', function(e) {
            marker.setLatLng(e.latlng);
            if (circle) circle.setLatLng(e.latlng);
            window.parent.postMessage({ type: 'PIN_MOVED', lat: e.latlng.lat, lng: e.latlng.lng }, '*');
          });
        </script>
      </body>
    </html>
  `;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/75 justify-end">
        <View className="bg-[#12121A] rounded-t-3xl border-t border-[#262638] max-h-[92%] flex-col">
          {/* Header */}
          <View className="px-5 pt-4 pb-3 border-b border-[#222230] flex-row items-center justify-between">
            <View className="flex-row items-center gap-2.5">
              <View className="w-9 h-9 rounded-full bg-[#8B5CF6]/20 items-center justify-center border border-[#8B5CF6]/40">
                <AppIcon name="map-pin" size={17} color="#A78BFA" />
              </View>
              <View>
                <Text className="text-white text-[16px] font-bold">
                  {title || (mode === "SERVICE_RADIUS" ? "Coverage & Service Radius" : "Venue Pin & Location")}
                </Text>
                <Text className="text-[#8E8E93] text-[11px]">
                  {mode === "SERVICE_RADIUS"
                    ? "Set your base location & service perimeter"
                    : "Pinpoint venue coordinates & directions"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-[#1E1E2A] items-center justify-center border border-[#323246]"
            >
              <AppIcon name="x" size={16} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-5 pt-3" showsVerticalScrollIndicator={false}>
            {/* Address Input */}
            <View className="mb-3">
              <Text className="text-[#A1A1AA] text-[12px] font-semibold mb-1">
                {mode === "SERVICE_RADIUS" ? "Base Location / Business Hub" : "Venue / Celebration Address"}
              </Text>
              <View className="flex-row items-center bg-[#1A1A26] rounded-xl px-3 border border-[#2D2D40]">
                <AppIcon name="map-pin" size={15} color="#8B5CF6" />
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="e.g. Palace Grounds, Bellary Rd, Bengaluru"
                  placeholderTextColor="#6B7280"
                  className="flex-1 py-3 px-2 text-white text-[13px]"
                />
                <TouchableOpacity
                  onPress={handleLocateMe}
                  disabled={locating}
                  className="bg-[#8B5CF6]/20 px-2.5 py-1.5 rounded-lg border border-[#8B5CF6]/40 flex-row items-center gap-1"
                >
                  {locating ? (
                    <ActivityIndicator size="small" color="#A78BFA" />
                  ) : (
                    <>
                      <AppIcon name="crosshair" size={12} color="#A78BFA" />
                      <Text className="text-[#A78BFA] text-[11px] font-bold">GPS</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Interactive Map Visualizer / Pin Controller */}
            <View className="mb-3 rounded-2xl overflow-hidden border border-[#2D2D40] bg-[#161622]">
              {Platform.OS === "web" ? (
                <View className="w-full h-52 relative">
                  <iframe
                    srcDoc={mapHtml}
                    title="Interactive Map"
                    style={{ width: "100%", height: "100%", border: "none" }}
                  />
                  <View className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20">
                    <Text className="text-white text-[10px] font-medium">Click / Drag Pin</Text>
                  </View>
                </View>
              ) : (
                /* Native mobile visualizer */
                <View className="w-full h-44 bg-[#1E1E2E] items-center justify-center p-4">
                  <View className="w-14 h-14 rounded-full bg-[#8B5CF6]/20 items-center justify-center border border-[#8B5CF6]/50 mb-2">
                    <AppIcon name="navigation" size={24} color="#A78BFA" />
                  </View>
                  <Text className="text-white text-[13px] font-bold">
                    Coordinates: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                  </Text>
                  <Text className="text-[#9CA3AF] text-[11px] text-center mt-1">
                    {mode === "SERVICE_RADIUS"
                      ? `Serving clients within a ${radiusKm} km radius`
                      : "Pin-drop directions ready for navigation"}
                  </Text>
                </View>
              )}

              {/* Coordinates Pill Bar */}
              <View className="flex-row items-center justify-between px-3 py-2 bg-[#1A1A28] border-t border-[#2A2A3C]">
                <View className="flex-row items-center gap-1.5">
                  <AppIcon name="globe" size={13} color="#9CA3AF" />
                  <Text className="text-[#9CA3AF] text-[11px]">
                    Lat: {latitude.toFixed(4)} • Lng: {longitude.toFixed(4)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleOpenGoogleMapsPreview}
                  className="flex-row items-center gap-1"
                >
                  <Text className="text-[#60A5FA] text-[11px] font-semibold">Preview in Maps</Text>
                  <AppIcon name="external-link" size={12} color="#60A5FA" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Service Radius Slider (Only in SERVICE_RADIUS mode) */}
            {mode === "SERVICE_RADIUS" && (
              <View className="mb-4 bg-[#161622] p-3.5 rounded-2xl border border-[#2D2D40]">
                <View className="flex-row items-center justify-between mb-2">
                  <View>
                    <Text className="text-white text-[13px] font-bold">Service Coverage Radius</Text>
                    <Text className="text-[#9CA3AF] text-[11px]">
                      Max distance you travel for celebrations
                    </Text>
                  </View>
                  <View className="bg-[#8B5CF6]/20 px-3 py-1 rounded-full border border-[#8B5CF6]/40">
                    <Text className="text-[#A78BFA] text-[13px] font-extrabold">{radiusKm} km</Text>
                  </View>
                </View>

                {/* Preset Radius Pills */}
                <View className="flex-row gap-2 mt-2">
                  {RADIUS_OPTIONS.map((r) => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setRadiusKm(r)}
                      className={`flex-1 py-1.5 rounded-lg items-center justify-center border ${
                        radiusKm === r
                          ? "bg-[#8B5CF6] border-[#8B5CF6]"
                          : "bg-[#1E1E2E] border-[#2E2E42]"
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-bold ${
                          radiusKm === r ? "text-white" : "text-[#9CA3AF]"
                        }`}
                      >
                        {r} km
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text className="text-[#6B7280] text-[10px] mt-2 italic">
                  Approx. {Math.round(Math.PI * radiusKm * radiusKm).toLocaleString("en-IN")} km² coverage
                  area around your hub.
                </Text>
              </View>
            )}

            {/* Quick Hub Selector */}
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-white text-[13px] font-bold">Popular Indian Celebration Hubs</Text>
                <Text className="text-[#8E8E93] text-[11px]">One-tap pin drop</Text>
              </View>

              {/* City Filter Pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                <View className="flex-row gap-1.5">
                  {cities.map((city) => (
                    <TouchableOpacity
                      key={city}
                      onPress={() => setFilterCity(city)}
                      className={`px-3 py-1 rounded-full border ${
                        filterCity === city
                          ? "bg-[#8B5CF6] border-[#8B5CF6]"
                          : "bg-[#1A1A26] border-[#2A2A3C]"
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-medium ${
                          filterCity === city ? "text-white" : "text-[#9CA3AF]"
                        }`}
                      >
                        {city}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Venue Hub List */}
              <View className="gap-1.5 max-h-48">
                {filteredHubs.slice(0, 6).map((hub) => (
                  <TouchableOpacity
                    key={hub.name}
                    onPress={() => handleSelectHub(hub)}
                    className="p-2.5 rounded-xl bg-[#181824] border border-[#272738] flex-row items-center justify-between active:bg-[#202030]"
                  >
                    <View className="flex-row items-center gap-2 flex-1 pr-2">
                      <AppIcon name="map-pin" size={13} color="#8B5CF6" />
                      <View>
                        <Text className="text-white text-[12px] font-semibold">{hub.name}</Text>
                        <Text className="text-[#9CA3AF] text-[10px]">{hub.city}</Text>
                      </View>
                    </View>
                    <View className="bg-[#242436] px-2 py-0.5 rounded text-right">
                      <Text className="text-[#C4B5FD] text-[10px]">Select</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Bottom Confirmation Bar */}
          <View className="p-4 border-t border-[#222230] bg-[#161622] flex-row gap-3">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 py-3 rounded-xl bg-[#222230] items-center justify-center border border-[#333345]"
            >
              <Text className="text-[#9CA3AF] text-[13px] font-semibold">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              className="flex-[2] py-3 rounded-xl bg-[#8B5CF6] items-center justify-center shadow-lg shadow-purple-500/25"
            >
              <Text className="text-white text-[13px] font-bold">
                {mode === "SERVICE_RADIUS" ? "Confirm Coverage Zone" : "Set Venue Location"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
