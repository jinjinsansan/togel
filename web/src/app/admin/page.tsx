"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Profile = {
  id: string;
  username: string;
  avatar_url: string;
  updated_at: string;
};

export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchProfiles = async () => {
      // Note: By default, RLS policies might prevent reading all profiles.
      // You need to ensure you have an RLS policy on 'profiles' table that allows the admin to read all.
      // OR use a service role key in an API route (safer).
      // For this client-side demo, we assume policy allows it or we handle it.
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching profiles:", error);
      } else {
        setProfiles(data || []);
      }
      setLoading(false);
    };

    fetchProfiles();
  }, [supabase]);

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
      
      <div className="mb-8 p-4 border rounded-lg bg-slate-50">
        <h2 className="text-xl font-semibold mb-2">Dashboard</h2>
        <p>Total Users: {loading ? "..." : profiles.length}</p>
      </div>

      <h2 className="text-2xl font-bold mb-4">User List</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-2 text-left">ID</th>
                <th className="border p-2 text-left">Username</th>
                <th className="border p-2 text-left">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-slate-50">
                  <td className="border p-2 font-mono text-sm">{profile.id}</td>
                  <td className="border p-2">{profile.username || "No Name"}</td>
                  <td className="border p-2 text-sm">
                    {new Date(profile.updated_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
