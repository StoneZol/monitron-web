"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  applyIncomingSiteFollow,
  getTabSyncSenderId,
  subscribeSiteFollow,
  subscribeSitePresence,
  type SiteFollowMessage,
} from "@/lib/tabBroadcast";

/**
 * Site-wide heartbeats + “follow master” soft-nav.
 * Mount once in the root layout so home/guide tabs also listen.
 */
export function SiteFollowBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => subscribeSitePresence(() => {}), []);

  useEffect(() => {
    return subscribeSiteFollow((msg: SiteFollowMessage) => {
      if (msg.senderId === getTabSyncSenderId()) return;

      applyIncomingSiteFollow(msg);

      const here = pathRef.current;
      const target = msg.href;
      if (here === target || here.startsWith(`${target}?`)) return;

      router.push(target);
    });
  }, [router]);

  return null;
}
