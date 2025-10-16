import './ItineraryDisplay.css'

export interface Attraction {
  name: string;
  description: string;
  importance_score: number;
  average_visit_time_hours: number;
  best_time_of_day: string;
  city: string;
  travelTip?: string;
  foodSuggestion?: string;
}

export interface ItineraryResponse {
  cities: string[];
  days: number;
  itineraries: {
    Combined: Record<string, Attraction[]>;
  };
  error?: string;
}

export default function ItineraryDisplay({ data }: { data: ItineraryResponse | null }) {
  if (!data) return null;
  if (data.error) return <p className="error">{data.error}</p>;

  const itineraries = data.itineraries;
  const hasCombined = !!itineraries["Combined"];

  return (
    <div className="itinerary-container">
      {hasCombined && (
        <>
          <h2 className="section-title">
            Itinerary for {data.cities.join(", ")} ({data.days} days)
          </h2>
          {Object.entries(itineraries["Combined"]).map(([day, attractions]) => (
            <div key={day} className="day-card">
              <h3>{day}</h3>
              <div className="attractions-grid">
                {attractions.map((a, idx) => (
                  <div key={idx} className="attraction-card">
                    <h4>{a.name}</h4>
                    <p className="desc">{a.description}</p>
                    <p><strong>City:</strong> {a.city}</p>
                    <p><strong>Best Time:</strong> {a.best_time_of_day}</p>
                    <p><strong>Visit Duration:</strong> {a.average_visit_time_hours} hrs</p>
                    {a.travelTip && <p><strong>Tip:</strong> {a.travelTip}</p>}
                    {a.foodSuggestion && <p><strong>Food:</strong> {a.foodSuggestion}</p>}
                  </div>
                ))}

                {/* {attractions.map((a, idx) => (
                  <div key={idx} className="attraction-card">
                    <img
                      src={`https://source.unsplash.com/400x250/?${encodeURIComponent(a.name)}`}
                      alt={a.name}
                      className="attraction-image"
                    />
                    <h4>{a.name}</h4>
                    <p className="desc">{a.description}</p>
                    <p><strong>City:</strong> {a.city}</p>
                    <p><strong>Best Time:</strong> {a.best_time_of_day}</p>
                    <p><strong>Visit Duration:</strong> {a.average_visit_time_hours} hrs</p>
                    {a.travelTip && <p><strong>Tip:</strong> {a.travelTip}</p>}
                    {a.foodSuggestion && <p><strong>Food:</strong> {a.foodSuggestion}</p>}
                  </div>
                ))} */}

              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
