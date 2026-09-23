import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const [count, setCount] = useState(0);

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 py-8 items-center pb-24"
        showsVerticalScrollIndicator={false}
      >
        {/* Status Badge */}
        <View className="flex-row items-center bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-1.5 mb-6">
          <View className="w-2.5 h-2.5 rounded-full bg-emerald-400 mr-2" />
          <Text className="text-emerald-400 font-medium text-xs tracking-wider uppercase">
            Tailwind CSS & NativeWind Active
          </Text>
        </View>

        {/* Header Section */}
        <View className="items-center mb-8 px-4">
          <Text className="text-3xl font-extrabold text-white text-center mb-2 tracking-tight">
            CelebrateHub
          </Text>
          <Text className="text-slate-400 text-center text-sm leading-relaxed max-w-xs">
            If you see modern styling, vibrant colors, and rounded cards below, your CSS is working correctly!
          </Text>
        </View>

        {/* Color Palette Verification Grid */}
        <View className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-6 shadow-lg shadow-black/50">
          <Text className="text-slate-300 font-semibold text-sm mb-3">
            Color Palette Check
          </Text>
          <View className="flex-row justify-between gap-2">
            <View className="flex-1 items-center bg-indigo-600 rounded-xl py-3">
              <Text className="text-white text-xs font-bold">Indigo</Text>
            </View>
            <View className="flex-1 items-center bg-emerald-600 rounded-xl py-3">
              <Text className="text-white text-xs font-bold">Emerald</Text>
            </View>
            <View className="flex-1 items-center bg-amber-600 rounded-xl py-3">
              <Text className="text-white text-xs font-bold">Amber</Text>
            </View>
            <View className="flex-1 items-center bg-rose-600 rounded-xl py-3">
              <Text className="text-white text-xs font-bold">Rose</Text>
            </View>
            <View className="flex-1 items-center bg-sky-600 rounded-xl py-3">
              <Text className="text-white text-xs font-bold">Sky</Text>
            </View>
          </View>
        </View>

        {/* Interactive State & Buttons Card */}
        <View className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-6 shadow-lg shadow-black/50">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-slate-300 font-semibold text-sm">
              Interactive Test
            </Text>
            <View className="bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/30">
              <Text className="text-indigo-400 text-xs font-medium">State: Active</Text>
            </View>
          </View>

          <View className="items-center py-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 mb-5">
            <Text className="text-slate-500 text-xs uppercase tracking-widest mb-1">Counter Value</Text>
            <Text className="text-4xl font-extrabold text-white">{count}</Text>
          </View>

          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => setCount((prev) => prev - 1)}
              className="flex-1 bg-slate-800 active:bg-slate-700 py-3 rounded-xl items-center border border-slate-700/60"
            >
              <Text className="text-white font-bold text-base">-1</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setCount(0)}
              className="px-4 bg-slate-800/60 active:bg-slate-700 py-3 rounded-xl items-center border border-slate-700/40"
            >
              <Text className="text-slate-400 font-semibold text-sm">Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setCount((prev) => prev + 1)}
              className="flex-1 bg-indigo-600 active:bg-indigo-500 py-3 rounded-xl items-center shadow-md shadow-indigo-600/30"
            >
              <Text className="text-white font-bold text-base">+1</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Features Checklist Card */}
        <View className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-6">
          <Text className="text-slate-300 font-semibold text-sm mb-3">
            Tailwind Features Verified
          </Text>
          
          <View className="gap-2.5">
            <View className="flex-row items-center justify-between py-2 border-b border-slate-800/80">
              <Text className="text-slate-400 text-sm">Flexbox & Grid Layouts</Text>
              <Text className="text-emerald-400 text-xs font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Working</Text>
            </View>
            <View className="flex-row items-center justify-between py-2 border-b border-slate-800/80">
              <Text className="text-slate-400 text-sm">Typography & Weights</Text>
              <Text className="text-emerald-400 text-xs font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Working</Text>
            </View>
            <View className="flex-row items-center justify-between py-2 border-b border-slate-800/80">
              <Text className="text-slate-400 text-sm">Borders & Rounded Corners</Text>
              <Text className="text-emerald-400 text-xs font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Working</Text>
            </View>
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-slate-400 text-sm">Opacity & Backgrounds</Text>
              <Text className="text-emerald-400 text-xs font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Working</Text>
            </View>
          </View>
        </View>

        {/* Quick Edit Tip */}
        <View className="w-full max-w-sm bg-indigo-950/40 border border-indigo-500/20 rounded-2xl p-4">
          <Text className="text-indigo-300 text-xs text-center leading-relaxed">
            💡 Edit <Text className="font-mono text-indigo-200 font-bold">src/app/index.tsx</Text> to start building your CelebrateHub components using Tailwind classes.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
