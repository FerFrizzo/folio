import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { cn } from "@/src/lib/cn";

type Props = {
  className?: string;
  height?: number;
  width?: number | "100%";
  rounded?: boolean;
};

export function Skeleton({ className, height = 14, width = "100%", rounded = true }: Props) {
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.6, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{ opacity, height, width, borderRadius: rounded ? 6 : 0 }}
      className={cn("bg-border", className)}
    />
  );
}

export function ListRowSkeleton() {
  return (
    <View className="gap-2 border-b border-border px-4 py-3">
      <View className="flex-row items-center justify-between">
        <Skeleton width={120} height={16} />
        <Skeleton width={80} height={16} />
      </View>
      <View className="flex-row items-center justify-between">
        <Skeleton width={160} height={12} />
        <Skeleton width={60} height={20} rounded />
      </View>
    </View>
  );
}
