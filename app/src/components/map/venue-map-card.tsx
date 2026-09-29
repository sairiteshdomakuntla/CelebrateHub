import React from "react";
import { View, Text, TouchableOpacity, Linking, Platform, Share } from "react-native";
import { WebView } from "react-native-webview";
import { AppIcon } from "@/components/ui/pro-icon";

interface VenueMapCardProps {
  location: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  eventTitle?: string;
  onEditPress?: () => void;
  canEdit?: boolean;
}

export function VenueMapCard({
  location,
  latitude,
  longitude,
  eventTitle = "Celebration Venue",
  onEditPress,
  canEdit = false,
}: VenueMapCardProps) {
  const latNum = latitude ? parseFloat(String(latitude)) : null;
  const lngNum = longitude ? parseFloat(String(longitude)) : null;

  const hasCoords = latNum !== null && lngNum !== null && !isNaN(latNum) && !isNaN(lngNum);

  const handleOpenDirections = () => {
    if (hasCoords) {
      const url = Platform.select({
        ios: `maps:0,0?q=${encodeURIComponent(location)}@${latNum},${lngNum}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${latNum},${lngNum}&destination_place_id=${encodeURIComponent(
          location
        )}`,
      });
      Linking.openURL(url);
    } else {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
      Linking.openURL(url);
    }
  };

  const handleShareLocation = async () => {
    try {
      const mapsUrl = hasCoords
        ? `https://www.google.com/maps/search/?api=1&query=${latNum},${lngNum}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

      const message = `📍 Venue for ${eventTitle}:\n${location}\n\nGoogle Maps Navigation:\n${mapsUrl}`;

      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: eventTitle, text: message, url: mapsUrl });
      } else {
        await Share.share({ message });
      }
    } catch {
      // user cancelled or share unsupported
    }
  };

  const miniMapHtml = hasCoords
    ? `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #F4F3EF; }
          #map { width: 100%; height: 100%; pointer-events: none; }
          .custom-pin {
            width: 26px;
            height: 26px;
            background: linear-gradient(135deg, #A855F7 0%, #7C3AED 100%);
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid #FFFFFF;
            box-shadow: 0 3px 10px rgba(124, 58, 237, 0.55);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .custom-pin::after {
            content: '';
            width: 8px;
            height: 8px;
            background: #FFFFFF;
            border-radius: 50%;
            transform: rotate(45deg);
          }
          .custom-pin-wrap { background: transparent; border: none; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { 
            zoomControl: false, 
            attributionControl: false, 
            dragging: false, 
            scrollWheelZoom: false, 
            doubleClickZoom: false,
            touchZoom: false
          }).setView([${latNum}, ${lngNum}], 14);
          
          var primaryTiles = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { 
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
          }).addTo(map);

          var backupTiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { 
            maxZoom: 19 
          });

          primaryTiles.on('tileerror', function() {
            if (!map.hasLayer(backupTiles)) {
              backupTiles.addTo(map);
            }
          });

          var pinIcon = L.divIcon({ 
            className: 'custom-pin-wrap', 
            html: '<div class="custom-pin"></div>', 
            iconSize: [26, 26], 
            iconAnchor: [13, 26] 
          });

          L.marker([${latNum}, ${lngNum}], { icon: pinIcon }).addTo(map);
        </script>
      </body>
    </html>
  `
    : "";

  return (
    <View className="bg-white border border-[#E8E6E1] rounded-2xl overflow-hidden mb-4 shadow-xs">
      {/* Map Header */}
      <View className="p-4 pb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5 flex-1 pr-2">
          <View className="w-8 h-8 rounded-full bg-[#F3EEFD] items-center justify-center border border-[#E9DFFC]">
            <AppIcon name="map-pin" size={15} color="#7C3AED" />
          </View>
          <View className="flex-1">
            <Text className="text-[#1C1C1E] text-[14px] font-bold" numberOfLines={1}>
              {location}
            </Text>
            <Text className="text-[#6E6E73] text-[11px]">Celebration Location & Navigation</Text>
          </View>
        </View>

        {canEdit && onEditPress && (
          <TouchableOpacity
            onPress={onEditPress}
            className="px-2.5 py-1.5 rounded-lg bg-[#F3EEFD] border border-[#E9DFFC] flex-row items-center gap-1 active:opacity-80"
          >
            <AppIcon name="edit-2" size={11} color="#7C3AED" />
            <Text className="text-[#7C3AED] text-[11px] font-bold">Change Venue</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Visual Map Canvas / Preview */}
      <View className="w-full h-40 bg-[#F4F3EF] relative overflow-hidden border-y border-[#E8E6E1]">
        {hasCoords ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onEditPress || handleOpenDirections}
            className="w-full h-full relative"
          >
            {Platform.OS === "web" ? (
              <iframe
                srcDoc={miniMapHtml}
                title="Venue Preview Map"
                style={{ width: "100%", height: "100%", border: "none", pointerEvents: "none" }}
              />
            ) : (
              <WebView
                source={{ html: miniMapHtml }}
                style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
                scrollEnabled={false}
                pointerEvents="none"
              />
            )}
            {/* Overlay hint */}
            <View className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full border border-black/10 flex-row items-center gap-1 shadow-xs">
              <AppIcon name="check-circle" size={10} color="#10B981" />
              <Text className="text-[#1C1C1E] text-[10px] font-semibold">Map Pin Verified</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View className="w-full h-full items-center justify-center relative">
            {/* Subtle grid background */}
            <View className="absolute inset-0 opacity-10">
              <View className="flex-1 flex-row">
                {[...Array(8)].map((_, i) => (
                  <View key={i} className="flex-1 border-r border-[#7C3AED]/30" />
                ))}
              </View>
            </View>

            {/* Center Target Marker */}
            <View className="items-center z-10">
              <View className="w-10 h-10 rounded-full bg-[#F3EEFD] items-center justify-center border-2 border-[#7C3AED] shadow-sm">
                <AppIcon name="map-pin" size={18} color="#7C3AED" />
              </View>
              <View className="w-2.5 h-1 rounded-full bg-black/20 mt-1" />
            </View>
          </View>
        )}

        {/* Floating coordinates badge */}
        {hasCoords && (
          <View className="absolute bottom-2.5 left-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full border border-black/10 flex-row items-center gap-1 shadow-xs">
            <AppIcon name="compass" size={11} color="#059669" />
            <Text className="text-[#059669] text-[10px] font-mono font-bold">
              {latNum.toFixed(4)}, {lngNum.toFixed(4)}
            </Text>
          </View>
        )}

        <View className="absolute bottom-2.5 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full border border-black/10 shadow-xs">
          <Text className="text-[#6E6E73] text-[10px] font-medium">Google Maps Ready</Text>
        </View>
      </View>

      {/* Action Footer */}
      <View className="p-3 bg-[#FBFBF9] flex-row gap-2">
        <TouchableOpacity
          onPress={handleOpenDirections}
          className="flex-1 py-2.5 rounded-xl bg-[#7C3AED] flex-row items-center justify-center gap-1.5 shadow-sm active:bg-[#6D28D9]"
        >
          <AppIcon name="navigation" size={14} color="#FFFFFF" />
          <Text className="text-white text-[12px] font-bold">Get Directions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleShareLocation}
          className="px-3.5 py-2.5 rounded-xl bg-white border border-[#E8E6E1] flex-row items-center justify-center gap-1.5 active:bg-[#F7F7F5]"
        >
          <AppIcon name="share-2" size={13} color="#6E6E73" />
          <Text className="text-[#3A3A3C] text-[12px] font-medium">Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
