import json
import re
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import ollama
from ollama import generate

app = FastAPI()

# Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/suggest-cities")
def suggest_cities(country: str):
    print(f"🌍 Received request for suggested cities in: {country}")

    prompt = f"""
    You are a travel assistant. List exactly 10 popular tourist cities in {country}.
    Rules:
    - Return only the city names, separated by commas.
    - No explanations, numbering, or extra words.
    - Do NOT include tags like <think> or reasoning.
    Example: Tokyo, Kyoto, Osaka, Sapporo, Hiroshima, Fukuoka, Nagoya, Nara, Yokohama, Kobe
    """

    try:
        result = ollama.chat(model="gemma3:1b", messages=[{"role": "user", "content": prompt}])
        response = result["message"]["content"].strip()

        # Split and remove duplicates
        cities = list(dict.fromkeys([r.strip() for r in response.split(",") if r.strip()]))

        print(f"🏙️ Suggested cities for {country}: {cities}")
        return {"country": country, "suggested_cities": cities}

    except Exception as e:
        print(f"❌ Error generating cities for {country}: {e}")
        return {"country": country, "suggested_cities": [], "error": str(e)}

@app.get("/api/validate-city")
def validate_city(country: str, city: str):
    try:
        prompt = f'You are a travel assistant. Answer only "YES" or "NO". Is "{city}" a real city in "{country}"?'
        result = ollama.chat(model="gemma3:1b", messages=[{"role": "user", "content": prompt}])
        valid = "YES" in result["message"]["content"].strip().upper()
        return {"country": country, "city": city, "valid": valid}
    except Exception as e:
        print(f"❌ Error validating city: {e}")
        return {"country": country, "city": city, "valid": False, "error": str(e)}

@app.get("/api/itinerary")
def generate_itinerary(cities: str = Query(...), days: int = Query(...)):
    """
    Generate a travel itinerary for multiple cities.
    Steps:
    1. Get must-visit attractions with ranking.
    2. Distribute attractions across days based on importance and visit duration.
    3. Generate travel tips and food suggestions for each attraction.
    """
    city_list = [c.strip() for c in cities.split(",") if c.strip()]
    print(f"🚀 Generating {days}-day ranked itinerary for: {city_list}")

    def clean_json(text: str) -> str:
        """Remove <think> blocks and markdown code fences."""
        text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
        text = re.sub(r"```json|```", "", text).strip()
        return text

    try:
        # STEP 1: Get must-visit attractions
        prompt_rank = f"""
        You are a professional travel planner.
        For each of these cities: {', '.join(city_list)},
        list 10 must-visit attractions with fields:
        - name
        - description (brief)
        - importance_score (1–10)
        - average_visit_time_hours (e.g., 1.5)
        - best_time_of_day (Morning/Afternoon/Evening)

        Return JSON only:
        {{
          "CityName": [
            {{
              "name": "...",
              "description": "...",
              "importance_score": 9.5,
              "average_visit_time_hours": 2.0,
              "best_time_of_day": "Morning"
            }}
          ]
        }}
        """
        result_rank = generate("gemma3:1b", prompt_rank)
        attractions = json.loads(clean_json(result_rank.get("response", "")))

        # STEP 2: Flatten and sort attractions
        all_attractions = [
            {**spot, "city": city}
            for city, spots in attractions.items()
            for spot in spots
        ]
        all_attractions.sort(key=lambda x: x["importance_score"], reverse=True)

        # Distribute attractions across days
        daily_plan = {f"Day {i+1}": [] for i in range(days)}
        day_time_used = [0] * days
        max_day_hours = 9

        for spot in all_attractions:
            for i in range(days):
                if day_time_used[i] + spot["average_visit_time_hours"] <= max_day_hours:
                    daily_plan[f"Day {i+1}"].append(spot)
                    day_time_used[i] += spot["average_visit_time_hours"]
                    break

        # STEP 3: Generate travel tips and food suggestions
        formatted_plan = {}
        for day, spots in daily_plan.items():
            if not spots:
                continue

            spot_list = "\n".join(
                [f"- {s['name']} ({s['city']}): {s['description']} ({s['best_time_of_day']})"
                 for s in spots]
            )

            prompt_day = f"""
            You are a travel itinerary planner.
            For each attraction below, generate:
            - A short travel tip (1 sentence)
            - A nearby food suggestion (1 local dish or restaurant)

            Attractions:\n{spot_list}

            Return JSON only:
            {{
              "Attractions": [
                {{
                  "name": "...",
                  "travelTip": "...",
                  "foodSuggestion": "..."
                }}
              ]
            }}
            """

            result_day = generate("deepseek-r1:1.5b", prompt_day)
            day_tips = []
            try:
                day_tips = json.loads(clean_json(result_day.get("response", ""))).get("Attractions", [])
            except Exception as e:
                print(f"⚠️ JSON parse failed for {day}, using fallback text: {e}")

            # Merge tips into spots
            enriched = []
            for s in spots:
                tip = next((d for d in day_tips if d["name"].lower() == s["name"].lower()), {})
                s["travelTip"] = tip.get("travelTip")
                s["foodSuggestion"] = tip.get("foodSuggestion")
                enriched.append(s)

            formatted_plan[day] = enriched

        return {"cities": city_list, "days": days, "itineraries": {"Combined": formatted_plan}}

    except Exception as e:
        print(f"❌ Error generating itinerary: {e}")
        return {"cities": city_list, "days": days, "itineraries": {"Combined": {}}, "error": str(e)}
