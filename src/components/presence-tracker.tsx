"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

export function PresenceTracker() {
  const { status } = useSession();

  useEffect(() => {
    const ping = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState !== "visible") return;

      if (status === "authenticated") {
        fetch("/api/user/heartbeat", { method: "POST", keepalive: true }).catch(
          () => {}
        );
      } else if (status === "unauthenticated") {
        fetch("/api/visitor/ping", { method: "POST", keepalive: true }).catch(
          () => {}
        );
      }
    };

    ping();

    const interval = setInterval(ping, 60000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        ping();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [status]);

  return null;
}
