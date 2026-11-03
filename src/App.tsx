import { RouterProvider } from "@tanstack/react-router";
import { HotelProvider } from "./lib/hotel-store";
import { router } from "./router";

function App() {
  return <HotelProvider><RouterProvider router={router} /></HotelProvider>;
}

export default App;
