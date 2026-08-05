// frontend/src/api/hotel.js
const API_BASE = '/api';

export async function getHotelsNearPlace(spot, radius = 2) {
  try {
    const url = `${API_BASE}/hotels/?latitude=${spot.latitude}&longitude=${spot.longitude}&place_name=${encodeURIComponent(spot.name)}&radius=${radius}`;
    console.log("[HOTEL API] Fetching hotels near coords:", url);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[HOTEL API] Error:', error);
    return [];
  }
}