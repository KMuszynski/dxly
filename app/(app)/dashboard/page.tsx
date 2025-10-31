"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

interface UserProfile {
  name: string;
  surname: string;
  full_name: string;
  type: "doctor" | "assistant";
  specialization?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setUser(session.user);

        // Fetch user profile
        const { data: userProfile } = await supabase
          .from("users")
          .select("*")
          .eq("user_id", session.user.id)
          .single();

        setProfile(userProfile);
      } else {
        // No session, redirect to login
        console.log("No session found, redirecting to login");
        router.push("/login");
        return;
      }
      setLoading(false);
    };

    getUser();

    // Listen for auth state changes (e.g., logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        console.log("Auth state changed - no session, redirecting to login");
        router.push("/login");
      } else {
        // User logged in, update state
        setUser(session.user);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!user) {
    return <div className="p-8">Error loading user data</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">
                Welcome, {profile ? profile.full_name : user.email}!
              </h2>
              <p className="text-gray-600">Email: {user.email}</p>
              {profile ? (
                <>
                  <p className="text-gray-600">Role: {profile.type}</p>
                  {profile.specialization && (
                    <p className="text-gray-600">
                      Specialization: {profile.specialization}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-yellow-600">
                  ⚠️ User profile not found. Please contact support to set up
                  your account.
                </p>
              )}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900">
                Authentication Status
              </h3>
              <p className="text-blue-700">
                ✅ You are successfully authenticated and can access this
                protected route.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
