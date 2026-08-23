"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

export function PresenceTracker() {
  const { data: session, status } = useSession();

  useEffect(() => {
    const ping = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState !== "visible") return;

      // Never track the site owner (admin): no heartbeat, no visitor ping.
      if (status === "authenticated") {
        if ((session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) {
          return;
        }
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
  }, [status, session]);

  return null;
}
