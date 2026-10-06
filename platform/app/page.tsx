"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Splash } from "@/components/ui";
import { Login } from "@/components/Login";

/** trainee sign-in; the coach signs in at /coach */
export default function Entry() {
  const { ready, session } = useStore();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [invite, setInvite] = useState(false);

  // ?login=client&phone=... comes from the WhatsApp message the coach sends
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("login") === "client") { setInvite(true); if (q.get("phone")) setPhone(q.get("phone")!); }
  }, []);

  useEffect(() => {
    if (!ready || !session) return;
    if (invite && session.role === "coach") return; // stay on the trainee login, don't jump to the coach panel
    router.replace(session.role === "coach" ? "/coach" : "/app");
  }, [ready, session, router, invite]);

  // already signed in: go straight to the panel instead of flashing the login form
  if (!ready || (session && !invite)) return <Splash />;

  // pending and paused clients get in, but only see the waiting screen (ClientShell)
  return <Login who="client" phone0={phone} onDone={() => router.push("/app")} />;
}
