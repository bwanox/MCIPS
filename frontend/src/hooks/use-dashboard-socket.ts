"use client";

import { useEffect } from "react";

import { getSocketClient } from "../lib/socket-client";
import type { Alert } from "../types/alert";
import type { StatsSummary } from "../types/stats";
import type { SimulationStatus } from "../types/simulation";

interface Options {
  onAlert: (alert: Alert) => void;
  onStats: (summary: StatsSummary) => void;
  onSimulation: (status: SimulationStatus) => void;
  onSystem: (status: unknown) => void;
}

export const useDashboardSocket = ({ onAlert, onStats, onSimulation, onSystem }: Options): void => {
  useEffect(() => {
    const socket = getSocketClient();
    socket.connect();
    socket.on("alert:new", onAlert);
    socket.on("stats:update", onStats);
    socket.on("simulation:status", onSimulation);
    socket.on("system:status", onSystem);

    return () => {
      socket.off("alert:new", onAlert);
      socket.off("stats:update", onStats);
      socket.off("simulation:status", onSimulation);
      socket.off("system:status", onSystem);
      socket.disconnect();
    };
  }, [onAlert, onStats, onSimulation, onSystem]);
};
