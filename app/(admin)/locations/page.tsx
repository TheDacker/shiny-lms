import { createClient } from "@/lib/supabase/server";
import LocationsClient from "./LocationsClient";

export default async function LocationsPage() {
  const supabase = await createClient();
  const { data: locations } = await supabase
    .from("locations")
    .select("id, name, state, created_at")
    .order("state")
    .order("name");

  return (
    <div className="space-y-5">
      <div>
        <h1
          className="text-2xl font-bold uppercase tracking-wide"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
        >
          Locations
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(31,57,109,0.55)" }}>
          {locations?.length ?? 0} location{locations?.length !== 1 ? "s" : ""} across UT, PA, MD
        </p>
      </div>

      <LocationsClient initialLocations={locations ?? []} />
    </div>
  );
}
