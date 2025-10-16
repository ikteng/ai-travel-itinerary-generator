import { useState } from "react";
import axios from "axios";
import "./InputForm.css";

interface InputFormProps {
  onGenerate: (cities: string[], days: number, setLoading: (loading: boolean) => void) => void;
}

export default function InputForm({ onGenerate }: InputFormProps) {
  const [country, setCountry] = useState("");
  const [days, setDays] = useState(3);
  const [suggestedCities, setSuggestedCities] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [customCity, setCustomCity] = useState("");
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchSuggestedCities = async (country: string): Promise<string[]> => {
    const res = await axios.get("http://127.0.0.1:8000/api/suggest-cities", {
      params: { country },
    });
    return res.data.suggested_cities;
  };


  const handleSearch = async () => {
    if (!country.trim()) {
      alert("Please enter a country name first.");
      return;
    }

    setLoadingCities(true);
    setSearched(true);
    setSuggestedCities([]);
    setSelectedCities([]);

    try {
      const cities = await fetchSuggestedCities(country);
      setSuggestedCities(cities);
    } catch (err) {
      console.error("Failed to fetch suggested cities:", err);
      alert("Could not fetch suggested cities. Please try again.");
    } finally {
      setLoadingCities(false);
    }
  };

  const toggleCitySelection = (city: string) => {
    setSelectedCities((prev) =>
      prev.includes(city)
        ? prev.filter((c) => c !== city)
        : [...prev, city]
    );
  };

  const addCustomCity = async () => {
    const trimmed = customCity.trim();
    if (!trimmed) return;

    // Check if already selected
    if (selectedCities.includes(trimmed)) {
      alert(`${trimmed} is already selected.`);
      return;
    }

    // Optional: check against suggested cities first
    if (!suggestedCities.includes(trimmed)) {
      // Call backend to validate if it's a real city in this country
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/validate-city?country=${encodeURIComponent(country)}&city=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (!data.valid) {
          alert(`${trimmed} does not appear to be a city in ${country}.`);
          return;
        }
      } catch (err) {
        console.error("City validation failed:", err);
        alert("Could not validate city. Try again later.");
        return;
      }
    }

    setSelectedCities([...selectedCities, trimmed]);
    setCustomCity("");
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCities.length === 0) {
      alert("Please select or add at least one city!");
      return;
    }

    setLoadingGenerate(true);
    await onGenerate(selectedCities, days, setLoadingGenerate);
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      {/* Country Input + Search Button */}
      <div className="form-row inline-label">
        <label htmlFor="country">Country:</label>
        <div className="country-search-row">
          <input
            id="country"
            type="text"
            placeholder="Enter country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
          />
          <button
            type="button"
            className="search-btn"
            onClick={handleSearch}
            disabled={loadingCities}
          >
            {loadingCities ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {loadingCities && <p className="loading-text">Fetching suggested cities...</p>}

      {/* Suggested + Custom City Section */}
      {searched && !loadingCities && (
        <div className="city-section">
          {suggestedCities.length > 0 && (
            <div>
              <label>Suggested Cities:</label>
              <div className="button-group">
                {suggestedCities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    className={`city-btn ${selectedCities.includes(city) ? "selected" : ""}`}
                    onClick={() => toggleCitySelection(city)}
                  >
                    {city}
                  </button>
                ))}

                {/* Inline “Other” City Input */}
                <div className="custom-city-inline">
                  <input
                    type="text"
                    placeholder="Other city..."
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addCustomCity())
                    }
                  />
                  <button
                    type="button"
                    className="add-btn"
                    onClick={addCustomCity}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Cities Section */}
      {selectedCities.length > 0 && (
        <>
          <div className="form-row">
            <label>Selected Cities:</label>
            <div className="selected-list">
              {selectedCities.map((city) => (
                <span key={city} className="selected-tag">
                  {city}
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => toggleCitySelection(city)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-row inline-label">
            <label htmlFor="days">Days:</label>
            <input
              id="days"
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            />
          </div>

         <button type="submit" disabled={loadingGenerate}>
          {loadingGenerate ? "Generating Itinerary..." : "Generate Itinerary"}
        </button>
        </>
      )}
    </form>
  );
}
