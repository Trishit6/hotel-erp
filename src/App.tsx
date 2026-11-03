import { RouterProvider } from "@tanstack/react-router";
import { HotelProvider } from "./lib/hotel-store";
import { ThemeProvider } from "./lib/theme";
import { router } from "./router";

function App() {
  return (
    <ThemeProvider>
      <HotelProvider>
        <RouterProvider router={router} />
      </HotelProvider>
    </ThemeProvider>
  );
}

export default App;
