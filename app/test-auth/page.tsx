"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestAuth() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      console.log("Test auth - Session:", session);
      setSession(session);
      setLoading(false);
    };

    getSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
      <div className="space-y-4">
        <p>
          <strong>Session exists:</strong> {session ? "Yes" : "No"}
        </p>
        {session && (
          <>
            <p>
              <strong>User ID:</strong> {session.user.id}
            </p>
            <p>
              <strong>Email:</strong> {session.user.email}
            </p>
            <p>
              <strong>Access Token:</strong>{" "}
              {session.access_token ? "Present" : "Missing"}
            </p>
          </>
        )}
        <div className="mt-4">
          <a
            href="/dashboard"
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Try Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
