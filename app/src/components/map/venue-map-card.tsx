import React from "react";
import { View, Text, TouchableOpacity, Linking, Platform, Share } from "react-native";
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

  return (
    <View className="bg-[#161622] border border-[#2D2D40] rounded-2xl overflow-hidden mb-4 shadow-md">
      {/* Map Header */}
      <View className="p-4 pb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5 flex-1 pr-2">
          <View className="w-8 h-8 rounded-full bg-[#8B5CF6]/20 items-center justify-center border border-[#8B5CF6]/40">
            <AppIcon name="map-pin" size={15} color="#A78BFA" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-[14px] font-bold" numberOfLines={1}>
              {location}
            </Text>
            <Text className="text-[#8E8E93] text-[11px]">Celebration Location & Navigation</Text>
          </View>
        </View>

        {canEdit && onEditPress && (
          <TouchableOpacity
            onPress={onEditPress}
            className="px-2.5 py-1 rounded-lg bg-[#222232] border border-[#333348] flex-row items-center gap-1"
          >
            <AppIcon name="edit-2" size={11} color="#A78BFA" />
            <Text className="text-[#A78BFA] text-[11px] font-semibold">Change</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Visual Map Canvas / Preview */}
      <View className="w-full h-36 bg-[#1A1A28] relative overflow-hidden items-center justify-center border-y border-[#262638]">
        {/* Subtle grid background */}
        <View className="absolute inset-0 opacity-15">
          <View className="flex-1 flex-row">
            {[...Array(8)].map((_, i) => (
              <View key={i} className="flex-1 border-r border-[#8B5CF6]/30" />
            ))}
          </View>
        </View>

        {/* Center Target Marker */}
        <View className="items-center z-10">
          <View className="w-10 h-10 rounded-full bg-[#8B5CF6]/30 items-center justify-center border-2 border-[#8B5CF6] shadow-lg shadow-purple-500/50">
            <AppIcon name="map-pin" size={18} color="#FFFFFF" />
          </View>
          <View className="w-2.5 h-1 rounded-full bg-black/40 mt-1" />
        </View>

        {/* Floating coordinates badge */}
        {hasCoords && (
          <View className="absolute bottom-2.5 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 flex-row items-center gap-1">
            <AppIcon name="compass" size={11} color="#34D399" />
            <Text className="text-[#34D399] text-[10px] font-semibold">
              {latNum.toFixed(4)}, {lngNum.toFixed(4)}
            </Text>
          </View>
        )}

        <View className="absolute top-2.5 right-3 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
          <Text className="text-[#9CA3AF] text-[10px]">Google Maps Ready</Text>
        </View>
      </View>

      {/* Action Footer */}
      <View className="p-3 bg-[#13131D] flex-row gap-2">
        <TouchableOpacity
          onPress={handleOpenDirections}
          className="flex-1 py-2.5 rounded-xl bg-[#8B5CF6] flex-row items-center justify-center gap-1.5 shadow-md shadow-purple-500/20"
        >
          <AppIcon name="navigation" size={14} color="#FFFFFF" />
          <Text className="text-white text-[12px] font-bold">Get Directions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleShareLocation}
          className="px-3.5 py-2.5 rounded-xl bg-[#222232] border border-[#333348] flex-row items-center justify-center gap-1.5"
        >
          <AppIcon name="share-2" size={13} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-[12px] font-medium">Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
