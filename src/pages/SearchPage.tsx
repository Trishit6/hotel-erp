import { useSearch } from "@tanstack/react-router";
import { AvailabilityResults } from "../components/hotel/AvailabilityResults";

export default function SearchPage() {
  const search = useSearch({ from: "/search" });
  return <AvailabilityResults search={search} />;
}
