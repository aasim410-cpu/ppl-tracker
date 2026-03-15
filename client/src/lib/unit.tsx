import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";
import { useAuth } from "./auth";

const KG_TO_LBS = 2.20462;

type Unit = "kg" | "lbs";

interface UnitContextType {
  unit: Unit;
  toggleUnit: () => void;
  displayWeight: (kgValue: number) => number;
  toKg: (displayValue: number) => number;
  unitLabel: string;
}

const UnitContext = createContext<UnitContextType | null>(null);

export function useUnit() {
  const ctx = useContext(UnitContext);
  if (!ctx) throw new Error("useUnit must be inside UnitProvider");
  return ctx;
}

export function UnitProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unit, setUnit] = useState<Unit>("kg");

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/settings");
      return res.json();
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (settings?.unit) {
      setUnit(settings.unit as Unit);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (newUnit: Unit) => {
      await apiRequest("PUT", "/api/settings", { unit: newUnit });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  const toggleUnit = useCallback(() => {
    const newUnit: Unit = unit === "kg" ? "lbs" : "kg";
    setUnit(newUnit);
    saveMutation.mutate(newUnit);
  }, [unit, saveMutation]);

  const displayWeight = useCallback(
    (kgValue: number): number => {
      if (unit === "lbs") {
        return Math.round(kgValue * KG_TO_LBS * 10) / 10;
      }
      return Math.round(kgValue * 10) / 10;
    },
    [unit]
  );

  const toKg = useCallback(
    (displayValue: number): number => {
      if (unit === "lbs") {
        return Math.round((displayValue / KG_TO_LBS) * 10) / 10;
      }
      return displayValue;
    },
    [unit]
  );

  return (
    <UnitContext.Provider value={{ unit, toggleUnit, displayWeight, toKg, unitLabel: unit }}>
      {children}
    </UnitContext.Provider>
  );
}
