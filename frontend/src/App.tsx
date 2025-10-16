import { useState } from "react";
import InputForm from "./components/InputForm";
import ItineraryDisplay, {type ItineraryResponse} from "./components/ItineraryDisplay";
import "./App.css";
import axios from "axios";

export const fetchItinerary = async (
  cities: string[],
  days: number
): Promise<ItineraryResponse> => {
  const citiesParam = cities.join(",");
  const res = await axios.get("http://127.0.0.1:8000/api/itinerary", {
    params: { cities: citiesParam, days },
  });
  return res.data;
};

function App() {
  const [itinerary, setItinerary] = useState<ItineraryResponse | null>(null);

  const handleGenerate = async (
    cities: string[],
    days: number,
    setLoading: (loading: boolean) => void
  ) => {
    // Clear previous itinerary before fetching
    setItinerary(null);
    setLoading(true);

    try {
      const data = await fetchItinerary(cities, days);
      setItinerary(data);
    } catch (err) {
      console.error("Error fetching itinerary:", err);
      setItinerary({
        cities,
        days,
        itineraries: { Combined: {} },
        error: "Failed to fetch itinerary",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <h1 className="title">AI Travel Itinerary Generator</h1>
      <InputForm onGenerate={handleGenerate}/>
      <ItineraryDisplay data={itinerary} />
    </div>
  );
}

export default App;
