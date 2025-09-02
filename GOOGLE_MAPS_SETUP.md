# Google Maps Integration Setup

This application uses Google Maps for location-based punch clock features. To enable Google Maps functionality, you need to set up a Google Maps API key.

## Setup Instructions

### 1. Get Google Maps API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing project
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Create credentials (API Key)
5. Restrict the API key to your domain for security

### 2. Configure Environment Variable

Add your Google Maps API key to your `.env` file:

```properties
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your_actual_api_key_here"
```

### 3. API Restrictions (Recommended)

For security, restrict your API key in the Google Cloud Console:

**HTTP referrers (websites):**
- `http://localhost:*/*` (for development)
- `https://yourdomain.com/*` (for production)

**API restrictions:**
- Maps JavaScript API
- Places API
- Geocoding API

## Features

### Location-Based Punch Clock

The Google Maps integration enables:

- **Interactive Map Selection**: Employees and administrators can select locations using an interactive map
- **Address Search**: Search for locations using Google Places API
- **Visual Radius**: See the allowed radius area on the map
- **GPS Coordinates**: Precise location tracking with latitude/longitude
- **Geocoding**: Convert addresses to coordinates automatically

### Usage

1. Go to Settings → Punch Clock → Access
2. Select "Specific locations" radio button
3. Click "Add with Map" to open the Google Maps location picker
4. Search for a location or click on the map
5. Adjust the radius using the slider
6. Save the location

The system will enforce location-based restrictions when employees try to punch in/out.
