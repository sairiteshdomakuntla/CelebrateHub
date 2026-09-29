import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Dimensions,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
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

interface SearchResultItem {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
}

// Curated list of popular celebration hotspots across major Indian metropolitan hubs
const POPULAR_HUBS = [
  { name: "Indiranagar / Koramangala", city: "Bengaluru", lat: 12.9716, lng: 77.6412 },
  { name: "Palace Grounds, Bellary Rd", city: "Bengaluru", lat: 13.0067, lng: 77.5813 },
  { name: "Whitefield / ITPL", city: "Bengaluru", lat: 12.9698, lng: 77.7499 },
  { name: "Bandra Kurla Complex (BKC)", city: "Mumbai", lat: 19.0657, lng: 72.8687 },
  { name: "Juhu / Andheri West", city: "Mumbai", lat: 19.1075, lng: 72.8263 },
  { name: "Marine Drive / Nariman Point", city: "Mumbai", lat: 18.9438, lng: 72.8234 },
  { name: "Aerocity / Chhatarpur Farmhouses", city: "New Delhi", lat: 28.5028, lng: 77.1738 },
  { name: "Connaught Place / Central", city: "New Delhi", lat: 28.6315, lng: 77.2167 },
  { name: "Cyber City / Sector 29", city: "Gurugram", lat: 28.4949, lng: 77.0895 },
  { name: "HITEC City / Gachibowli", city: "Hyderabad", lat: 17.4435, lng: 78.3772 },
  { name: "Banjara Hills / Jubilee Hills", city: "Hyderabad", lat: 17.4265, lng: 78.4357 },
  { name: "ECR / Neelankarai Beachside", city: "Chennai", lat: 12.9492, lng: 80.2548 },
  { name: "Anna Nagar / Kilpauk", city: "Chennai", lat: 13.085, lng: 80.2101 },
  { name: "Koregaon Park / Kalyani Nagar", city: "Pune", lat: 18.5362, lng: 73.894 },
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
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [filterCity, setFilterCity] = useState("ALL");

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const webViewRef = useRef<WebView | null>(null);

  const screenHeight = Dimensions.get("window").height;
  const sheetHeight = Math.min(Math.max(screenHeight * 0.86, 560), 760);

  // Sync state when modal becomes visible
  useEffect(() => {
    if (visible) {
      setAddress(initialAddress || "");
      const newLat = initialLatitude || 12.9716;
      const newLng = initialLongitude || 77.5946;
      const newRad = initialRadiusKm || 25;
      setLatitude(newLat);
      setLongitude(newLng);
      setRadiusKm(newRad);
      setSearchResults([]);
      setSearchQuery("");
    }
  }, [visible, initialAddress, initialLatitude, initialLongitude, initialRadiusKm]);

  // Reverse geocoding helper (OpenStreetMap Nominatim)
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            "User-Agent": "CelebrateHubApp/1.0",
            Accept: "application/json",
          },
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data?.display_name) {
          setAddress(data.display_name);
        } else {
          setAddress(`Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        }
      } else {
        setAddress(`Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      }
    } catch {
      setAddress(`Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Send message to map iframe (Web) or webview (Native)
  const postToMap = useCallback((msg: object) => {
    if (Platform.OS === "web" && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(msg, "*");
    } else if (webViewRef.current) {
      const jsCode = `if (window.handleParentMessage) { window.handleParentMessage(${JSON.stringify(
        msg
      )}); } true;`;
      webViewRef.current.injectJavaScript(jsCode);
    }
  }, []);

  // Web window message listener
  useEffect(() => {
    if (Platform.OS !== "web" || !visible) return;

    const handleWindowMessage = (event: MessageEvent) => {
      let data = event.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (data?.type === "PIN_MOVED") {
        const rawLat = parseFloat(data.lat);
        const rawLng = parseFloat(data.lng);
        if (!isNaN(rawLat) && !isNaN(rawLng)) {
          const lat = parseFloat(rawLat.toFixed(6));
          const lng = parseFloat(rawLng.toFixed(6));
          setLatitude(lat);
          setLongitude(lng);
          reverseGeocode(lat, lng);
        }
      }
    };

    window.addEventListener("message", handleWindowMessage);
    return () => {
      window.removeEventListener("message", handleWindowMessage);
    };
  }, [visible, reverseGeocode]);

  // Native WebView message handler
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === "PIN_MOVED") {
        const rawLat = parseFloat(data.lat);
        const rawLng = parseFloat(data.lng);
        if (!isNaN(rawLat) && !isNaN(rawLng)) {
          const lat = parseFloat(rawLat.toFixed(6));
          const lng = parseFloat(rawLng.toFixed(6));
          setLatitude(lat);
          setLongitude(lng);
          reverseGeocode(lat, lng);
        }
      }
    } catch (err) {
      console.warn("Could not parse map message:", err);
    }
  };

  // Handle address search
  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          q
        )}&limit=5&countrycodes=in`,
        {
          headers: {
            "User-Agent": "CelebrateHubApp/1.0",
            Accept: "application/json",
          },
        }
      );
      if (resp.ok) {
        const list = await resp.json();
        if (list && list.length > 0) {
          setSearchResults(list);
          if (list.length === 1) {
            handleSelectSearchResult(list[0]);
          }
        } else {
          Alert.alert("No Results", `No places found matching "${q}". Try city or landmark name.`);
        }
      } else {
        Alert.alert("Search Error", "Could not complete search. You can select directly on the map.");
      }
    } catch {
      Alert.alert("Search Error", "Network error during address search.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (item: SearchResultItem) => {
    const lat = parseFloat(parseFloat(item.lat).toFixed(6));
    const lng = parseFloat(parseFloat(item.lon).toFixed(6));
    setLatitude(lat);
    setLongitude(lng);
    setAddress(item.display_name);
    setSearchResults([]);
    setSearchQuery("");
    postToMap({ type: "SET_CENTER", lat, lng, radiusKm, zoom: 15 });
  };

  // Handle GPS Locate Me
  const handleLocateMe = async () => {
    setIsLocating(true);

    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(6));
          const lng = parseFloat(pos.coords.longitude.toFixed(6));
          setLatitude(lat);
          setLongitude(lng);
          setIsLocating(false);
          postToMap({ type: "SET_CENTER", lat, lng, radiusKm, zoom: 15 });
          reverseGeocode(lat, lng);
        },
        () => {
          setIsLocating(false);
          Alert.alert("Location", "Could not read GPS coordinates. Please select from venues below.");
        },
        { enableHighAccuracy: true, timeout: 9000 }
      );
      return;
    }

    // Native platform (Android / iOS)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Permission",
          "Enable location access in Settings to find your current location."
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = parseFloat(pos.coords.latitude.toFixed(6));
      const lng = parseFloat(pos.coords.longitude.toFixed(6));
      setLatitude(lat);
      setLongitude(lng);
      postToMap({ type: "SET_CENTER", lat, lng, radiusKm, zoom: 15 });
      reverseGeocode(lat, lng);
    } catch {
      Alert.alert("Location", "Could not read your GPS position.");
    } finally {
      setIsLocating(false);
    }
  };

  // Select Popular Hub
  const handleSelectHub = (hub: (typeof POPULAR_HUBS)[0]) => {
    setLatitude(hub.lat);
    setLongitude(hub.lng);
    setAddress(`${hub.name}, ${hub.city}`);
    setSearchResults([]);
    postToMap({ type: "SET_CENTER", lat: hub.lat, lng: hub.lng, radiusKm, zoom: 14 });
  };

  // Change Radius
  const handleRadiusChange = (newRadius: number) => {
    setRadiusKm(newRadius);
    postToMap({ type: "SET_RADIUS", radiusKm: newRadius });
  };

  const handleOpenGoogleMapsPreview = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  const handleConfirm = () => {
    if (!address.trim()) {
      Alert.alert("Address Required", "Please select a location on the map or enter a venue name.");
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

  // Filtered hubs based on search/city
  const filteredHubs = POPULAR_HUBS.filter((h) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = filterCity === "ALL" || h.city === filterCity;
    return matchesSearch && matchesCity;
  });

  const cities = ["ALL", "Bengaluru", "Mumbai", "New Delhi", "Gurugram", "Hyderabad", "Chennai", "Pune", "Goa"];

  // HTML map embed with interactive Leaflet map & CartoDB tiles
  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { box-sizing: border-box; }
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #F4F3EF; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          #map { width: 100%; height: 100%; }
          
          /* Custom celebratory marker */
          .custom-pin-wrapper {
            background: transparent;
            border: none;
          }
          .custom-pin-container {
            position: relative;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .custom-pin {
            width: 30px;
            height: 30px;
            background: linear-gradient(135deg, #A855F7 0%, #7C3AED 100%);
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid #FFFFFF;
            box-shadow: 0 4px 14px rgba(124, 58, 237, 0.55);
            cursor: grab;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .custom-pin::after {
            content: '';
            width: 10px;
            height: 10px;
            background: #FFFFFF;
            border-radius: 50%;
            transform: rotate(45deg);
          }
          .pin-pulse {
            position: absolute;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: rgba(139, 92, 246, 0.35);
            animation: pulse-ring 2s infinite ease-out;
            pointer-events: none;
          }
          @keyframes pulse-ring {
            0% { transform: scale(0.6); opacity: 0.9; }
            100% { transform: scale(1.6); opacity: 0; }
          }
          .leaflet-bar a {
            background-color: #FFFFFF !important;
            color: #1C1C1E !important;
            border-color: #E8E6E1 !important;
            font-size: 16px !important;
          }
          .leaflet-bar a:hover {
            background-color: #F7F7F5 !important;
            color: #7C3AED !important;
          }
          .leaflet-control-attribution {
            background: rgba(255, 255, 255, 0.8) !important;
            color: #8E8E93 !important;
            font-size: 9px !important;
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

          var map = L.map('map', { 
            zoomControl: true,
            attributionControl: true 
          }).setView([lat, lng], 13);
          
          var primaryTiles = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '© Google Maps'
          }).addTo(map);

          var backupTiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
          });

          primaryTiles.on('tileerror', function() {
            if (!map.hasLayer(backupTiles)) {
              backupTiles.addTo(map);
            }
          });

          var pinIcon = L.divIcon({
            className: 'custom-pin-wrapper',
            html: '<div class="custom-pin-container"><div class="pin-pulse"></div><div class="custom-pin"></div></div>',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
          });

          var marker = L.marker([lat, lng], { 
            icon: pinIcon, 
            draggable: true 
          }).addTo(map);

          var circle = null;
          if (isRadiusMode) {
            circle = L.circle([lat, lng], {
              color: '#7C3AED',
              fillColor: '#8B5CF6',
              fillOpacity: 0.16,
              radius: radiusMeters,
              weight: 2.5
            }).addTo(map);
          }

          function notifyParent(lat, lng) {
            var payload = JSON.stringify({ type: 'PIN_MOVED', lat: lat, lng: lng });
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(payload);
            }
            if (window.parent && window.parent.postMessage) {
              window.parent.postMessage(payload, '*');
            }
          }

          marker.on('dragend', function(e) {
            var pos = marker.getLatLng();
            if (circle) circle.setLatLng(pos);
            notifyParent(pos.lat, pos.lng);
          });

          map.on('click', function(e) {
            marker.setLatLng(e.latlng);
            if (circle) circle.setLatLng(e.latlng);
            notifyParent(e.latlng.lat, e.latlng.lng);
          });

          // Handle incoming messages from React/React Native
          window.handleParentMessage = function(data) {
            if (!data) return;
            if (data.type === 'SET_CENTER') {
              var newLat = data.lat;
              var newLng = data.lng;
              marker.setLatLng([newLat, newLng]);
              if (circle) {
                circle.setLatLng([newLat, newLng]);
                if (data.radiusKm) circle.setRadius(data.radiusKm * 1000);
              }
              map.flyTo([newLat, newLng], data.zoom || 14, { animate: true, duration: 0.8 });
            } else if (data.type === 'SET_RADIUS') {
              if (circle && data.radiusKm) {
                circle.setRadius(data.radiusKm * 1000);
              }
            }
          };

          window.addEventListener('message', function(ev) {
            var data = ev.data;
            if (typeof data === 'string') {
              try { data = JSON.parse(data); } catch(e) { return; }
            }
            window.handleParentMessage(data);
          });
        </script>
      </body>
    </html>
  `;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/60 justify-end">
        {/* Backdrop Dismiss touchable */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          className="flex-1"
        />

        {/* Modal Card with explicit height to prevent flex collapse */}
        <View
          style={{ height: sheetHeight }}
          className="bg-white rounded-t-3xl border-t border-[#E8E6E1] flex-col overflow-hidden shadow-2xl"
        >
          {/* Top Sheet Drag Indicator */}
          <View className="items-center pt-2.5 pb-1">
            <View className="w-10 h-1.5 rounded-full bg-[#D1D1D6]" />
          </View>

          {/* Header */}
          <View className="px-5 pt-2 pb-3.5 border-b border-[#F0EFEA] flex-row items-center justify-between bg-white">
            <View className="flex-row items-center gap-3 flex-1 pr-2">
              <View className="w-10 h-10 rounded-full bg-[#F3EEFD] items-center justify-center border border-[#E9DFFC]">
                <AppIcon name="map-pin" size={18} color="#7C3AED" />
              </View>
              <View className="flex-1">
                <Text className="text-[#1C1C1E] text-[16px] font-bold" numberOfLines={1}>
                  {title || (mode === "SERVICE_RADIUS" ? "Coverage & Service Radius" : "Select Celebration Venue")}
                </Text>
                <Text className="text-[#6E6E73] text-[12px]" numberOfLines={1}>
                  {mode === "SERVICE_RADIUS"
                    ? "Tap map to set hub & customize delivery perimeter"
                    : "Tap map or drag pin to select your venue"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-[#F2F1ED] items-center justify-center border border-[#E5E5EA] active:bg-[#EBEAE5]"
            >
              <AppIcon name="x" size={16} color="#3A3A3C" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-5 pt-3" showsVerticalScrollIndicator={false}>
            {/* Address Search Bar */}
            <View className="mb-3">
              <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1">
                {mode === "SERVICE_RADIUS" ? "Search Base Hub / Area" : "Search Venue, Landmark, or Address"}
              </Text>
              <View className="flex-row items-center bg-[#F7F7F5] rounded-xl px-3 border border-[#E8E6E1] gap-2">
                <AppIcon name="search" size={15} color="#7C3AED" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                  placeholder="e.g. Palace Grounds, Indiranagar, or BKC"
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 py-3 text-[#1C1C1E] text-[14px]"
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")} className="p-1">
                    <AppIcon name="x" size={14} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className={`px-3 py-1.5 rounded-lg flex-row items-center gap-1 ${
                    searchQuery.trim() ? "bg-[#7C3AED]" : "bg-[#E8E6E1]"
                  }`}
                >
                  {isSearching ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text
                      className={`text-[12px] font-bold ${
                        searchQuery.trim() ? "text-white" : "text-[#8E8E93]"
                      }`}
                    >
                      Search
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Search Suggestions Dropdown */}
              {searchResults.length > 0 && (
                <View className="mt-1.5 bg-white border border-[#E8E6E1] rounded-xl overflow-hidden shadow-lg z-20">
                  <View className="px-3 py-1.5 bg-[#F7F7F5] border-b border-[#E8E6E1] flex-row justify-between items-center">
                    <Text className="text-[#6E6E73] text-[11px] font-semibold">Matching Places</Text>
                    <TouchableOpacity onPress={() => setSearchResults([])}>
                      <Text className="text-[#7C3AED] text-[11px] font-bold">Close</Text>
                    </TouchableOpacity>
                  </View>
                  {searchResults.map((item) => (
                    <TouchableOpacity
                      key={item.place_id}
                      onPress={() => handleSelectSearchResult(item)}
                      className="px-3 py-2.5 border-b border-[#F0EFEA] flex-row items-start gap-2 active:bg-[#F9F8F6]"
                    >
                      <AppIcon name="map-pin" size={13} color="#7C3AED" />
                      <Text className="text-[#1C1C1E] text-[12px] flex-1 leading-4" numberOfLines={2}>
                        {item.display_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Selected Location / Address Card */}
            <View className="mb-3 bg-[#F9F8F6] rounded-xl p-3 border border-[#E8E6E1]">
              <View className="flex-row items-center justify-between mb-1">
                <View className="flex-row items-center gap-1.5">
                  <AppIcon name="check-circle" size={13} color="#059669" />
                  <Text className="text-[#059669] text-[11px] font-bold uppercase tracking-wider">
                    Selected Location
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleLocateMe}
                  disabled={isLocating}
                  className="bg-[#F3EEFD] px-2.5 py-1 rounded-lg border border-[#E9DFFC] flex-row items-center gap-1 active:opacity-80"
                >
                  {isLocating ? (
                    <ActivityIndicator size="small" color="#7C3AED" />
                  ) : (
                    <>
                      <AppIcon name="crosshair" size={12} color="#7C3AED" />
                      <Text className="text-[#7C3AED] text-[11px] font-bold">Use Current GPS</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View className="mt-1">
                {isGeocoding ? (
                  <View className="flex-row items-center gap-2 py-1">
                    <ActivityIndicator size="small" color="#7C3AED" />
                    <Text className="text-[#6E6E73] text-[12px] italic">Finding address from pin...</Text>
                  </View>
                ) : (
                  <TextInput
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Address name..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    className="text-[#1C1C1E] text-[13px] font-medium leading-5 py-1"
                  />
                )}
              </View>
            </View>

            {/* Interactive Map Visualizer */}
            <View className="mb-3 rounded-2xl overflow-hidden border border-[#E8E6E1] bg-[#F4F3EF] shadow-sm">
              <View className="w-full h-64 relative bg-[#F4F3EF]">
                {Platform.OS === "web" ? (
                  <iframe
                    ref={iframeRef}
                    srcDoc={mapHtml}
                    title="Interactive Map"
                    style={{ width: "100%", height: "100%", border: "none" }}
                  />
                ) : (
                  <WebView
                    ref={webViewRef}
                    source={{ html: mapHtml }}
                    style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
                    onMessage={handleWebViewMessage}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    geolocationEnabled={true}
                    scrollEnabled={false}
                  />
                )}

                {/* Floating Action Badge */}
                <View className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-black/10 flex-row items-center gap-1.5 shadow-sm">
                  <View className="w-2 h-2 rounded-full bg-[#10B981]" />
                  <Text className="text-[#1C1C1E] text-[11px] font-semibold">
                    Tap map or drag pin to select
                  </Text>
                </View>
              </View>

              {/* Coordinates & Google Maps Preview Bar */}
              <View className="flex-row items-center justify-between px-3.5 py-2.5 bg-white border-t border-[#E8E6E1]">
                <View className="flex-row items-center gap-1.5">
                  <AppIcon name="compass" size={13} color="#059669" />
                  <Text className="text-[#3A3A3C] text-[11px] font-mono">
                    {latitude.toFixed(4)}, {longitude.toFixed(4)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleOpenGoogleMapsPreview}
                  className="flex-row items-center gap-1"
                >
                  <Text className="text-[#2563EB] text-[11px] font-semibold">Preview in Google Maps</Text>
                  <AppIcon name="external-link" size={12} color="#2563EB" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Service Radius Slider (Only in SERVICE_RADIUS mode) */}
            {mode === "SERVICE_RADIUS" && (
              <View className="mb-4 bg-[#F9F8F6] p-3.5 rounded-2xl border border-[#E8E6E1]">
                <View className="flex-row items-center justify-between mb-2">
                  <View>
                    <Text className="text-[#1C1C1E] text-[13px] font-bold">Service Coverage Perimeter</Text>
                    <Text className="text-[#6E6E73] text-[11px]">
                      Max distance you travel for celebrations
                    </Text>
                  </View>
                  <View className="bg-[#F3EEFD] px-3 py-1 rounded-full border border-[#E9DFFC]">
                    <Text className="text-[#7C3AED] text-[13px] font-extrabold">{radiusKm} km</Text>
                  </View>
                </View>

                {/* Preset Radius Pills */}
                <View className="flex-row gap-2 mt-2">
                  {RADIUS_OPTIONS.map((r) => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => handleRadiusChange(r)}
                      className={`flex-1 py-2 rounded-xl items-center justify-center border transition-all ${
                        radiusKm === r
                          ? "bg-[#7C3AED] border-[#7C3AED] shadow-sm"
                          : "bg-white border-[#E8E6E1]"
                      }`}
                    >
                      <Text
                        className={`text-[12px] font-bold ${
                          radiusKm === r ? "text-white" : "text-[#3A3A3C]"
                        }`}
                      >
                        {r} km
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text className="text-[#6E6E73] text-[11px] mt-2 italic">
                  Live circle on the map visualizes ~
                  {Math.round(Math.PI * radiusKm * radiusKm).toLocaleString("en-IN")} km² coverage
                  area around your hub.
                </Text>
              </View>
            )}

            {/* Quick Hub Selector */}
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[#1C1C1E] text-[13px] font-bold">Popular Indian Celebration Hubs</Text>
                <Text className="text-[#6E6E73] text-[11px]">One-tap pin drop</Text>
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
                          ? "bg-[#7C3AED] border-[#7C3AED]"
                          : "bg-white border-[#E8E6E1]"
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-medium ${
                          filterCity === city ? "text-white" : "text-[#6E6E73]"
                        }`}
                      >
                        {city}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Venue Hub List */}
              <View className="gap-1.5 max-h-52">
                {filteredHubs.slice(0, 6).map((hub) => (
                  <TouchableOpacity
                    key={hub.name}
                    onPress={() => handleSelectHub(hub)}
                    className="p-2.5 rounded-xl bg-white border border-[#E8E6E1] flex-row items-center justify-between active:bg-[#F9F8F6]"
                  >
                    <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                      <View className="w-7 h-7 rounded-full bg-[#F3EEFD] items-center justify-center border border-[#E9DFFC]">
                        <AppIcon name="map-pin" size={12} color="#7C3AED" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[#1C1C1E] text-[12px] font-semibold" numberOfLines={1}>
                          {hub.name}
                        </Text>
                        <Text className="text-[#6E6E73] text-[10px]">{hub.city}</Text>
                      </View>
                    </View>
                    <View className="bg-[#F3EEFD] px-2.5 py-1 rounded-lg">
                      <Text className="text-[#7C3AED] text-[10px] font-semibold">Select</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Bottom Confirmation Bar */}
          <View className="border-t border-[#F0EFEA] bg-white px-4 pt-3 pb-6 flex-row gap-3">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 py-3.5 rounded-xl bg-[#F2F1ED] items-center justify-center border border-[#E5E5EA] active:bg-[#EBEAE5]"
            >
              <Text className="text-[#3A3A3C] text-[13px] font-semibold">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              className="flex-[2] py-3.5 rounded-xl bg-[#7C3AED] items-center justify-center shadow-lg shadow-purple-500/20 active:bg-[#6D28D9]"
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
