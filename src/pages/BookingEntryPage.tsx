import { useSearch } from "@tanstack/react-router";
import { AvailabilityResults } from "../components/hotel/AvailabilityResults";

export default function BookingEntryPage() {
  const search = useSearch({ from: "/booking" });
  return <AvailabilityResults search={search} />;
}
