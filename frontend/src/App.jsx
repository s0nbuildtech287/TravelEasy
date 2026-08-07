// C:\Users\XUAN SON\Desktop\Xuan Son Version\TravelEasy\frontend\src\App.jsx
import React, { useEffect, useRef, useState } from 'react';

const PLANE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="32" height="32" class="plane-svg">
  <path fill="#5de6ff" d="M448 336v-40L288 192V79.2c0-26-21-47.2-47-47.2s-47 21.2-47 47.2V192L32 296v40l160-48v117.8l-42.6 32v38.2l76.6-22.8 76.6 22.8v-38.2l-42.6-32V288z"/>
</svg>
`;

const PLANE_SELECTED_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="36" height="36" class="plane-svg plane-selected">
  <path fill="#ff5d8f" d="M448 336v-40L288 192V79.2c0-26-21-47.2-47-47.2s-47 21.2-47 47.2V192L32 296v40l160-48v117.8l-42.6 32v38.2l76.6-22.8 76.6 22.8v-38.2l-42.6-32V288z"/>
</svg>
`;

const AIRPORTS = [
  { name: 'Tân Sơn Nhất', code: 'SGN', lat: 10.8189, lng: 106.6519 },
  { name: 'Nội Bài', code: 'HAN', lat: 21.2212, lng: 105.8072 },
  { name: 'Đà Nẵng', code: 'DAD', lat: 16.0439, lng: 108.2003 },
  { name: 'Changi', code: 'SIN', lat: 1.3644, lng: 103.9915 },
  { name: 'Bangkok', code: 'BKK', lat: 13.69, lng: 100.75 },
  { name: 'Kuala Lumpur', code: 'KUL', lat: 2.7456, lng: 101.7099 },
  { name: 'Hong Kong', code: 'HKG', lat: 22.3080, lng: 113.9149 },
  { name: 'Phnom Penh', code: 'PNH', lat: 11.5466, lng: 104.8442 }
];
const AIRLINE_FILTERS = [
  { id: 'ALL', name: 'Tất cả', flag: '🌏' },
  { id: 'VN', name: 'Việt Nam', flag: '🇻🇳', keywords: ['vietnam', 'vietjet', 'bamboo', 'pacific', 'hvn', 'vjc', 'bba', 'pic'] },
  { id: 'TH', name: 'Thái Lan', flag: '🇹🇭', keywords: ['thai', 'fd', 'tha'] },
  { id: 'SG', name: 'Singapore', flag: '🇸🇬', keywords: ['singapore', 'scoot', 'sia', 'sco'] },
  { id: 'MY', name: 'Malaysia', flag: '🇲🇾', keywords: ['malaysia', 'airasia', 'mas', 'axm'] },
  { id: 'CN', name: 'Trung Quốc', flag: '🇨🇳', keywords: ['china', 'cathay', 'air china', 'cca', 'csn', 'ces', 'cpa'] }
];

const SEAPORTS = [
  { name: 'Toàn Biển Đông', code: 'EAST SEA', lat: 16.0, lon: 108.0, zoom: 6 },
  { name: 'Cảng Hải Phòng', code: 'HAI PHONG', lat: 20.86, lon: 106.68, zoom: 11 },
  { name: 'Cái Mép - Vũng Tàu', code: 'VUNG TAU', lat: 10.51, lon: 107.02, zoom: 11 },
  { name: 'Cảng Đà Nẵng', code: 'DA NANG', lat: 16.08, lon: 108.22, zoom: 11 },
  { name: 'Cảng Quy Nhơn', code: 'QUY NHON', lat: 13.77, lon: 109.24, zoom: 11 },
  { name: 'Cảng Singapore', code: 'SINGAPORE', lat: 1.26, lon: 103.84, zoom: 11 },
  { name: 'Cảng Hồng Kông', code: 'HONG KONG', lat: 22.28, lon: 114.15, zoom: 11 }
];

function App() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});      // Store active markers: { icao: marker }
  const polylinesRef = useRef({});    // Store trail polylines: { icao: polyline }
  const tileLayersRef = useRef({});   // Store tile layers instances
  
  const [flights, setFlights] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ total: 0, airborne: 0, ground: 0 });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [mapStyle, setMapStyle] = useState('dark');
  const [showFlights, setShowFlights] = useState(true); // Toggle flight markers visibility
  const [selectedAirlineFilter, setSelectedAirlineFilter] = useState('ALL'); // Country / Airline Filter
  const [fidsModalData, setFidsModalData] = useState(null); // Airport & Port FIDS Modal State
  const [aviationAlerts, setAviationAlerts] = useState([]); // Emergency Squawk & Holding Pattern Alerts
  const [isAlertsListExpanded, setIsAlertsListExpanded] = useState(false); // Expandable Alerts List toggle
  const showFlightsRef = useRef(showFlights);
  const selectedAirlineFilterRef = useRef(selectedAirlineFilter);

  useEffect(() => {
    showFlightsRef.current = showFlights;
  }, [showFlights]);

  useEffect(() => {
    selectedAirlineFilterRef.current = selectedAirlineFilter;
  }, [selectedAirlineFilter]);
  const [weatherMode, setWeatherMode] = useState('none'); // 'none', 'rain', 'temp', 'wind'
  const [weatherStatusText, setWeatherStatusText] = useState('');
  const [inspectedWeather, setInspectedWeather] = useState(null); // Real-time point weather inspector
  const weatherLayerRef = useRef(null);
  const [activeMode, setActiveMode] = useState('flights'); // 'flights' or 'ships'
  const [isNavOpen, setIsNavOpen] = useState(true); // Left vertical navigator toggle
  const [shipMapCenter, setShipMapCenter] = useState({ lat: 16.0, lon: 108.0, zoom: 6 });
  const [ships, setShips] = useState([]);
  const shipMarkersRef = useRef({});

  // Keep track of trails in a state/ref to draw paths
  const trailsRef = useRef({}); // { icao: [[lat, lng], ...] }

  const handleGoToAirport = (ap) => {
    const map = mapInstanceRef.current;
    if (map) {
      map.setView([ap.lat, ap.lng], 13); // Zoom to 13 to inspect runways!
    }
  };

  // Open FIDS Modal for Airport or Port
  const handleOpenFidsModal = async (target) => {
    setFidsModalData({ ...target, tab: 'departures', loading: true, departures: [], arrivals: [] });
    try {
      if (target.type === 'airport') {
        const resp = await fetch(`/api/airports/${target.code}/fids`);
        const data = await resp.json();
        setFidsModalData({ ...target, ...data, tab: 'departures', loading: false });
      } else {
        const resp = await fetch(`/api/ports/${encodeURIComponent(target.code)}/analytics`);
        const data = await resp.json();
        setFidsModalData({ ...target, ...data, loading: false });
      }
    } catch (err) {
      console.error("Error fetching FIDS data:", err);
      setFidsModalData({ ...target, loading: false });
    }
  };

  // 1. Initialize Map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    console.log("Initializing Leaflet Map...");
    const map = window.L.map(mapRef.current, {
      zoomControl: false // Position zoom control to top-right later
    }).setView([16.0, 108.0], 6);

    const darkTile = window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 20
    });

    const googleHybrid = window.L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      attribution: '&copy; Google Maps',
      maxZoom: 20
    });

    const googleStreets = window.L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      attribution: '&copy; Google Maps',
      maxZoom: 20
    });

    tileLayersRef.current = {
      dark: darkTile,
      hybrid: googleHybrid,
      streets: googleStreets
    };

    // Add default (dark)
    darkTile.addTo(map);

    window.L.control.zoom({ position: 'topright' }).addTo(map);
    mapInstanceRef.current = map;

    // Map click event listener to inspect real-time point weather (Temp °C & Wind Speed)
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current_weather=true`);
        const data = await res.json();
        if (data.current_weather) {
          const cw = data.current_weather;
          setInspectedWeather({
            lat: lat.toFixed(4),
            lng: lng.toFixed(4),
            temp: cw.temperature,
            windSpeed: cw.windspeed,
            windDir: cw.winddirection,
            weatherCode: cw.weathercode
          });
        }
      } catch (err) {
        console.error("Error inspecting point weather:", err);
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const handleSwitchStyle = (style) => {
    const map = mapInstanceRef.current;
    const layers = tileLayersRef.current;
    if (!map || !layers.dark || !layers.hybrid || !layers.streets) return;

    // Clear all existing map styles from the map
    if (map.hasLayer(layers.dark)) map.removeLayer(layers.dark);
    if (map.hasLayer(layers.hybrid)) map.removeLayer(layers.hybrid);
    if (map.hasLayer(layers.streets)) map.removeLayer(layers.streets);

    if (style === 'dark') {
      layers.dark.addTo(map);
    } else if (style === 'hybrid') {
      layers.hybrid.addTo(map);
    } else if (style === 'streets') {
      tileLayersRef.current[style].addTo(map);
    }
    setMapStyle(style);
  };

  // Switch Weather Radar Overlay Layer (Rain / Temp Heatmap / Wind)
  const handleSwitchWeather = async (mode) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing weather layer
    if (weatherLayerRef.current) {
      map.removeLayer(weatherLayerRef.current);
      weatherLayerRef.current = null;
    }

    if (mode === weatherMode) {
      setWeatherMode('none');
      setWeatherStatusText('');
      return;
    }

    setWeatherMode(mode);
    setWeatherStatusText('Đang tải dữ liệu ra-đa thời tiết thời gian thực...');

    try {
      let tileUrl = '';
      if (mode === 'rain') {
        const resp = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await resp.json();
        const pastRadar = data?.radar?.past;
        if (pastRadar && pastRadar.length > 0) {
          const latestPath = pastRadar[pastRadar.length - 1].path;
          tileUrl = `https://tilecache.rainviewer.com${latestPath}/256/{z}/{x}/{y}/2/1_1.png`;
          setWeatherStatusText('🌧️ Đang hiển thị Ra-đa Mây & Mưa (RainViewer Live)');
        }
      } else if (mode === 'temp') {
        // Global Thermal Infrared Satellite Layer for temperature gradient
        tileUrl = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/global-ir-900913/{z}/{x}/{y}.png';
        setWeatherStatusText('🌡️ Đang hiển thị Bản đồ Nhiệt độ Vệ tinh Hồng ngoại (Global IR Thermal)');
      } else if (mode === 'wind') {
        // Global Radar & Wind Stream Layer
        tileUrl = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png';
        setWeatherStatusText('💨 Đang hiển thị Ra-đa Tốc độ Gió & Bão NEXRAD');
      }

      if (tileUrl) {
        const weatherTile = window.L.tileLayer(tileUrl, {
          opacity: 0.85,
          maxZoom: 18,
          maxNativeZoom: 12, // Prevents "Zoom level not supported" when zooming close into airports!
          zIndex: 500
        });
        weatherTile.addTo(map);
        weatherTile.bringToFront();
        weatherLayerRef.current = weatherTile;
      }
    } catch (err) {
      console.error("Error loading weather tiles:", err);
      setWeatherStatusText('Không thể nạp dữ liệu ra-đa thời tiết. Vui lòng thử lại.');
    }
  };

  // 2. Fetch Flights Loop
  useEffect(() => {
    const fetchFlights = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/flights');
        if (response.ok) {
          const data = await response.json();
          const list = data.flights || [];
          const alertsList = data.alerts || [];
          setFlights(list);
          setAviationAlerts(alertsList);
          
          // Calculate stats
          const airborne = list.filter(f => !f.on_ground).length;
          setStats({
            total: list.length,
            airborne,
            ground: list.length - airborne
          });
          
          const now = new Date();
          setLastUpdated(now.toLocaleTimeString());
          updateMarkers(list);
        }
      } catch (err) {
        console.error("Error fetching flight vectors:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFlights();
    const interval = setInterval(fetchFlights, 6000); // Poll every 6s

    return () => clearInterval(interval);
  }, []);

  // Fetch Ships Loop
  useEffect(() => {
    const fetchShips = async () => {
      try {
        const response = await fetch('/api/ships');
        if (response.ok) {
          const data = await response.json();
          const list = data.ships || [];
          setShips(list);
          updateShipMarkers(list);
        }
      } catch (err) {
        console.error("Error fetching ship vectors:", err);
      }
    };

    fetchShips();
    const interval = setInterval(fetchShips, 12000); // Ships move slow, 12s is perfect

    return () => clearInterval(interval);
  }, []);

  // 3. Trigger marker updates immediately when map style, selected flight, visibility toggle or country filter changes
  useEffect(() => {
    if (flights.length > 0) {
      updateMarkers(flights);
    }
  }, [mapStyle, selectedFlight, showFlights, selectedAirlineFilter]);

  // Handle Map View centering when Seaport preset is selected or mode switches
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.invalidateSize();
    if (activeMode === 'ships') {
      map.setView([shipMapCenter.lat, shipMapCenter.lon], shipMapCenter.zoom);
      if (ships.length > 0) {
        updateShipMarkers(ships);
      }
    } else if (activeMode === 'flights') {
      if (flights.length > 0) {
        updateMarkers(flights);
      }
    }
  }, [activeMode, shipMapCenter]);

  // 4. Update Markers on Map
  const updateMarkers = (currentFlights) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // If flight visibility is toggled OFF, clear all flight markers & trails immediately
    if (!showFlightsRef.current) {
      Object.keys(markersRef.current).forEach(icao => {
        map.removeLayer(markersRef.current[icao]);
        delete markersRef.current[icao];
        if (polylinesRef.current[icao]) {
          map.removeLayer(polylinesRef.current[icao]);
          delete polylinesRef.current[icao];
        }
        delete trailsRef.current[icao];
      });
      return;
    }

    // Filter flights by country/airline selection
    let activeList = currentFlights;
    const filterId = selectedAirlineFilterRef.current;
    if (filterId !== 'ALL') {
      const activeFilterObj = AIRLINE_FILTERS.find(f => f.id === filterId);
      if (activeFilterObj && activeFilterObj.keywords.length > 0) {
        activeList = currentFlights.filter(f => {
          const text = `${f.airline} ${f.callsign}`.toLowerCase();
          return activeFilterObj.keywords.some(kw => text.includes(kw));
        });
      }
    }

    const currentIcaos = new Set(activeList.map(f => f.icao));

    // Remove old markers for flights that left the bounding box or filter
    Object.keys(markersRef.current).forEach(icao => {
      if (!currentIcaos.has(icao)) {
        map.removeLayer(markersRef.current[icao]);
        delete markersRef.current[icao];
        
        if (polylinesRef.current[icao]) {
          map.removeLayer(polylinesRef.current[icao]);
          delete polylinesRef.current[icao];
        }
        delete trailsRef.current[icao];
      }
    });

    // Add or update markers
    activeList.forEach(flight => {
      const { icao, latitude, longitude, heading, callsign, altitude_ft } = flight;
      
      // Update trail coordinates
      if (!trailsRef.current[icao]) {
        trailsRef.current[icao] = [];
      }
      const trail = trailsRef.current[icao];
      
      // Prevent duplicating consecutive identical coordinates in trail
      if (trail.length === 0 || trail[trail.length - 1][0] !== latitude || trail[trail.length - 1][1] !== longitude) {
        trail.push([latitude, longitude]);
        // Keep trail length reasonable (last 30 positions)
        if (trail.length > 30) trail.shift();
      }

      // Check if selected
      const isSelected = selectedFlight && selectedFlight.icao === icao;
      
      // Determine colors based on active mapStyle to guarantee maximum contrast
      let planeColor = '#5de6ff'; // default neon cyan for dark radar map
      let shadowColor = 'rgba(93, 230, 255, 0.7)';
      
      if (isSelected) {
        planeColor = '#ff5d8f'; // hot pink for selected
        shadowColor = 'rgba(255, 93, 143, 0.8)';
      } else if (mapStyle === 'hybrid') {
        planeColor = '#eab308'; // bright yellow for dark green/blue satellite hybrid
        shadowColor = 'rgba(234, 179, 8, 0.9)';
      } else if (mapStyle === 'streets') {
        planeColor = '#dc2626'; // dark red for bright gray street map
        shadowColor = 'rgba(220, 38, 38, 0.3)';
      }

      const planeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${isSelected ? 36 : 32}" height="${isSelected ? 36 : 32}">
        <path fill="${planeColor}" style="filter: drop-shadow(0px 0px 4px ${shadowColor});" d="M448 336v-40L288 192V79.2c0-26-21-47.2-47-47.2s-47 21.2-47 47.2V192L32 296v40l160-48v117.8l-42.6 32v38.2l76.6-22.8 76.6 22.8v-38.2l-42.6-32V288z"/>
      </svg>`;

      const iconHtml = `<div style="transform: rotate(${heading}deg); transform-origin: center; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        ${planeSvg}
      </div>`;

      const customIcon = window.L.divIcon({
        html: iconHtml,
        className: 'custom-plane-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      // Determine 3D altitude dynamic trail line color
      let trailColor = '#5de6ff'; // Default cruising cyan (> 25,000 FT)
      if (isSelected) {
        trailColor = '#ff5d8f'; // Hot pink for selected flight
      } else if (altitude_ft < 10000) {
        trailColor = '#10b981'; // Emerald Green for low altitude (< 10,000 FT)
      } else if (altitude_ft >= 10000 && altitude_ft < 25000) {
        trailColor = '#f59e0b'; // Amber Orange for mid altitude (10,000 - 25,000 FT)
      } else {
        trailColor = '#5de6ff'; // Neon Cyan for high altitude cruising (> 25,000 FT)
      }

      if (markersRef.current[icao]) {
        // Update existing marker position & rotation icon
        const marker = markersRef.current[icao];
        marker.setLatLng([latitude, longitude]);
        marker.setIcon(customIcon);
        
        // Update trail polyline
        if (polylinesRef.current[icao]) {
          const polyline = polylinesRef.current[icao];
          polyline.setLatLngs(trail);
          polyline.setStyle({
            color: trailColor,
            weight: isSelected ? 3 : 2,
            opacity: isSelected ? 0.8 : 0.5
          });
        }
      } else {
        // Create new marker
        const marker = window.L.marker([latitude, longitude], { icon: customIcon })
          .addTo(map)
          .on('click', () => {
            handleSelectFlight(flight);
          });
        
        // Tooltip for quick hover info
        marker.bindTooltip(`<b>${callsign}</b>`, {
          direction: 'top',
          offset: [0, -10],
          opacity: 0.85
        });

        markersRef.current[icao] = marker;

        // Create trail polyline
        const polyline = window.L.polyline(trail, {
          color: trailColor,
          weight: isSelected ? 3 : 2,
          opacity: isSelected ? 0.8 : 0.5,
          dashArray: '5, 5'
        }).addTo(map);

        polylinesRef.current[icao] = polyline;
      }
    });
  };

  // 5. Update Ship Markers on Map
  const updateShipMarkers = (currentShips) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentMmsis = new Set(currentShips.map(s => s.mmsi));

    // Remove old ship markers
    Object.keys(shipMarkersRef.current).forEach(mmsi => {
      if (!currentMmsis.has(mmsi)) {
        map.removeLayer(shipMarkersRef.current[mmsi]);
        delete shipMarkersRef.current[mmsi];
      }
    });

    // Add or update ship markers
    currentShips.forEach(ship => {
      const { mmsi, latitude, longitude, heading, name, speed } = ship;

      // Detailed realistic ship SVG pointing in its heading direction (emerald green)
      const shipSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="28" height="28">
        <g style="filter: drop-shadow(0px 0px 4px rgba(16, 185, 129, 0.9));">
          <!-- Ship Hull & Bow -->
          <path fill="#10b981" d="M256 16 C232 120, 192 240, 144 400 L168 448 L256 416 L344 448 L368 400 C320 240, 280 120, 256 16 Z"/>
          <!-- Ship Bridge / Cabin -->
          <rect x="224" y="260" width="64" height="80" rx="8" fill="#040d1a" stroke="#10b981" stroke-width="12"/>
          <!-- Bridge Windows -->
          <circle cx="240" cy="290" r="8" fill="#5de6ff"/>
          <circle cx="272" cy="290" r="8" fill="#5de6ff"/>
        </g>
      </svg>`;

      const iconHtml = `<div style="transform: rotate(${heading}deg); transform-origin: center; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
        ${shipSvg}
      </div>`;

      const customIcon = window.L.divIcon({
        html: iconHtml,
        className: 'custom-ship-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      if (shipMarkersRef.current[mmsi]) {
        const marker = shipMarkersRef.current[mmsi];
        marker.setLatLng([latitude, longitude]);
        marker.setIcon(customIcon);
      } else {
        const marker = window.L.marker([latitude, longitude], { icon: customIcon })
          .addTo(map);

        marker.bindTooltip(`<b>🚢 ${name}</b><br/>Tốc độ: ${speed} knots`, {
          direction: 'top',
          offset: [0, -8],
          opacity: 0.85
        });

        shipMarkersRef.current[mmsi] = marker;
      }
    });
  };

  const handleSelectFlight = async (flight) => {
    setSelectedFlight(flight);
    
    // Zoom/Center to plane coords
    const map = mapInstanceRef.current;
    if (map) {
      map.setView([flight.latitude, flight.longitude], map.getZoom() < 8 ? 8 : map.getZoom());
    }

    // Query full flight track starting from departure airport
    try {
      const resp = await fetch(`/api/flights/${flight.icao}/track`);
      if (resp.ok) {
        const data = await resp.json();
        const trackList = data.track || [];
        if (trackList.length > 0) {
          const fullPath = trackList.map(pt => [pt.lat, pt.lng]);
          trailsRef.current[flight.icao] = fullPath;
          
          if (mapInstanceRef.current && flights.length > 0) {
            updateMarkers(flights);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching full flight track:", err);
    }
  };

  const handleCenterOnSelected = () => {
    if (!selectedFlight) return;
    const map = mapInstanceRef.current;
    if (map) {
      map.panTo([selectedFlight.latitude, selectedFlight.longitude]);
    }
  };

  // Filter flights by search input & country selection
  const filteredFlights = flights.filter(f => {
    const matchesSearch = f.callsign.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.airline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.icao.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (!matchesSearch) return false;
    if (selectedAirlineFilter === 'ALL') return true;

    const activeFilterObj = AIRLINE_FILTERS.find(filter => filter.id === selectedAirlineFilter);
    if (!activeFilterObj || activeFilterObj.keywords.length === 0) return true;
    
    const text = `${f.airline} ${f.callsign}`.toLowerCase();
    return activeFilterObj.keywords.some(kw => text.includes(kw));
  });

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* 1. FLIGHT RADAR LEAFLET MAP CONTAINER */}
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '100%', 
          display: activeMode === 'flights' ? 'block' : 'none' 
        }}
      ></div>

      {/* 2. VESSEL FINDER LIVE MARINE TRAFFIC RADAR IFRAME */}
      {activeMode === 'ships' && (
        <iframe 
          key={`${shipMapCenter.lat}-${shipMapCenter.lon}-${shipMapCenter.zoom}`}
          src={`https://www.vesselfinder.com/aismap?zoom=${shipMapCenter.zoom}&lat=${shipMapCenter.lat}&lon=${shipMapCenter.lon}&width=100%25&height=100%25&names=true&mmsi=0&track=true&fleet=&fleet_only=false&location_button=true&store_position=true&theme=dark`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            border: 'none',
            zIndex: 1
          }}
          title="Live Marine Traffic Radar (VesselFinder)"
        />
      )}

      {/* LIVE AVIATION EMERGENCY & HOLDING PATTERN ALERTS PANEL (TOP RIGHT / BESIDE FLIGHT CARD) */}
      {aviationAlerts.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 20,
          right: selectedFlight ? 380 : 70,
          zIndex: 1500,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 8,
          maxWidth: 360,
          transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {/* Top Header Toggle Pill */}
          <div 
            onClick={() => setIsAlertsListExpanded(!isAlertsListExpanded)}
            style={{
              background: aviationAlerts.some(a => a.level === 'CRITICAL') ? 'rgba(239, 68, 68, 0.92)' : 'rgba(4, 13, 26, 0.92)',
              backdropFilter: 'blur(16px)',
              border: aviationAlerts.some(a => a.level === 'CRITICAL') ? '1px solid #ef4444' : '1px solid rgba(93, 230, 255, 0.5)',
              borderRadius: 20,
              padding: '6px 14px',
              color: '#ffffff',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s ease'
            }}
            title="Nhấp để Mở rộng / Thu gọn Danh sách Cảnh báo"
          >
            <i className="fa-solid fa-triangle-exclamation fa-beat-fade" style={{ color: aviationAlerts.some(a => a.level === 'CRITICAL') ? '#ffb35d' : '#5de6ff' }}></i>
            <span style={{ fontSize: 11, fontWeight: 800 }}>
              CẢNH BÁO KHẨN CẤP ({aviationAlerts.length})
            </span>
            <i className={isAlertsListExpanded ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down"} style={{ fontSize: 10, color: '#5de6ff' }}></i>
          </div>

          {/* Expanded Alerts Scrollable List */}
          {isAlertsListExpanded && (
            <div style={{
              background: 'rgba(4, 13, 26, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(93, 230, 255, 0.3)',
              borderRadius: 16,
              padding: 12,
              width: 340,
              maxHeight: 380,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              boxShadow: '0 12px 40px rgba(0,0,0,0.8)'
            }}>
              {aviationAlerts.map(alert => {
                const targetFlight = flights.find(f => f.callsign === alert.callsign || f.icao.toLowerCase() === alert.id.split('-').pop().toLowerCase());
                return (
                  <div
                    key={alert.id}
                    style={{
                      background: alert.level === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(93, 230, 255, 0.05)',
                      border: alert.level === 'CRITICAL' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(93, 230, 255, 0.2)',
                      borderRadius: 12,
                      padding: 10
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: alert.level === 'CRITICAL' ? '#ef4444' : '#5de6ff' }}>
                        {alert.title}
                      </span>
                      {targetFlight && (
                        <button
                          onClick={() => handleSelectFlight(targetFlight)}
                          style={{
                            background: 'linear-gradient(135deg, #5de6ff, #3b82f6)',
                            border: 'none',
                            color: '#040d1a',
                            borderRadius: 6,
                            padding: '3px 8px',
                            fontSize: 10,
                            fontWeight: 800,
                            cursor: 'pointer',
                            outline: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          title="Click để xem & định vị ngay máy bay này trên bản đồ"
                        >
                          <i className="fa-solid fa-crosshairs"></i>
                          {alert.callsign}
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: '#d8e3fb', lineHeight: '1.4' }}>
                      {alert.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {fidsModalData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(4, 13, 26, 0.85)',
          backdropFilter: 'blur(16px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: '#040d1a',
            border: '1px solid rgba(93, 230, 255, 0.4)',
            borderRadius: 20,
            width: 820,
            maxWidth: '95vw',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 0 50px rgba(93, 230, 255, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, rgba(93, 230, 255, 0.1), rgba(4, 13, 26, 0.8))',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: '#5de6ff' }}>
                  HỆ THỐNG BẢNG ĐIỆN TỬ SÂN BAY & THỐNG KÊ CẢNG BIỂN (LIVE FIDS & MARITIME)
                </div>
                <h2 style={{ margin: '4px 0 0 0', fontSize: 22, fontWeight: 800, color: '#ffffff', fontFamily: 'Outfit, sans-serif' }}>
                  {fidsModalData.type === 'airport' ? `✈️ SÂN BAY QUỐC TẾ ${fidsModalData.name} (${fidsModalData.code})` : `⚓ CẢNG BIỂN QUỐC TẾ ${fidsModalData.name}`}
                </h2>
              </div>

              <button
                onClick={() => setFidsModalData(null)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: 'none',
                  color: '#ff5d8f',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* MAIN CATEGORY SWITCHER (AIRPORTS vs SEAPORTS) */}
            <div style={{ padding: '12px 24px 0 24px', display: 'flex', gap: 10 }}>
              <button
                onClick={() => handleOpenFidsModal({ code: 'SGN', name: 'Tân Sơn Nhất', type: 'airport' })}
                style={{
                  background: fidsModalData.type === 'airport' ? 'linear-gradient(135deg, #5de6ff, #3b82f6)' : 'rgba(255,255,255,0.03)',
                  border: 'none',
                  color: fidsModalData.type === 'airport' ? '#040d1a' : '#d8e3fb',
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                ✈️ SÂN BAY HÀNG KHÔNG (FIDS)
              </button>
              <button
                onClick={() => handleOpenFidsModal({ code: 'HAI PHONG', name: 'Hải Phòng', type: 'port' })}
                style={{
                  background: fidsModalData.type === 'port' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.03)',
                  border: 'none',
                  color: fidsModalData.type === 'port' ? '#ffffff' : '#d8e3fb',
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                ⚓ CẢNG BIỂN HÀNG HẢI (PORT ANALYTICS)
              </button>
            </div>

            {/* Airport FIDS Tab Switcher */}
            {fidsModalData.type === 'airport' ? (
              <div style={{ padding: '16px 24px 0 24px', display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setFidsModalData({ ...fidsModalData, tab: 'departures' })}
                  style={{
                    background: fidsModalData.tab === 'departures' ? 'linear-gradient(135deg, #5de6ff, #3b82f6)' : 'rgba(255,255,255,0.03)',
                    border: 'none',
                    color: fidsModalData.tab === 'departures' ? '#040d1a' : '#d8e3fb',
                    padding: '8px 16px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  🛫 CẤT CÁNH (DEPARTURES)
                </button>
                <button
                  onClick={() => setFidsModalData({ ...fidsModalData, tab: 'arrivals' })}
                  style={{
                    background: fidsModalData.tab === 'arrivals' ? 'linear-gradient(135deg, #42f593, #059669)' : 'rgba(255,255,255,0.03)',
                    border: 'none',
                    color: fidsModalData.tab === 'arrivals' ? '#040d1a' : '#d8e3fb',
                    padding: '8px 16px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  🛬 HẠ CÁNH (ARRIVALS)
                </button>
              </div>
            ) : (
              /* Port Analytics Summary Bar */
              <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#587094', fontWeight: 700 }}>TÀU ĐANG LÀM HÀNG</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981', marginTop: 4 }}>{fidsModalData.berth_ships || 10} Tàu</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#587094', fontWeight: 700 }}>NEO CHỜ NGOÀI KHƠI</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b', marginTop: 4 }}>{fidsModalData.anchored_ships || 5} Tàu</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#587094', fontWeight: 700 }}>CHỈ SỐ THÔNG THOÁNG</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#5de6ff', marginTop: 4 }}>{fidsModalData.congestion_status || 'THÔNG THOÁNG'}</div>
                </div>
              </div>
            )}

            {/* LED Table Content */}
            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              {fidsModalData.loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#587094' }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8, fontSize: 18 }}></i>
                  Đang nạp bảng điện tử thời gian thực...
                </div>
              ) : fidsModalData.type === 'airport' ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(93, 230, 255, 0.3)', color: '#5de6ff', textAlign: 'left' }}>
                      <th style={{ padding: '10px 8px' }}>SỐ HIỆU</th>
                      <th style={{ padding: '10px 8px' }}>HÃNG BAY</th>
                      <th style={{ padding: '10px 8px' }}>MÁY BAY</th>
                      <th style={{ padding: '10px 8px' }}>{fidsModalData.tab === 'departures' ? 'ĐIỂM ĐẾN' : 'ĐIỂM ĐI'}</th>
                      <th style={{ padding: '10px 8px' }}>GATE/BELT</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>TRẠNG THÁI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((fidsModalData.tab === 'departures' ? fidsModalData.departures : fidsModalData.arrivals) || []).map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#ffffff' }}>
                        <td style={{ padding: '12px 8px', fontWeight: 800, color: '#ffb35d' }}>{row.callsign}</td>
                        <td style={{ padding: '12px 8px', color: '#d8e3fb' }}>{row.airline}</td>
                        <td style={{ padding: '12px 8px', color: '#587094' }}>{row.aircraft || 'A321'}</td>
                        <td style={{ padding: '12px 8px', fontWeight: 700, color: '#5de6ff' }}>{row.destination || row.origin}</td>
                        <td style={{ padding: '12px 8px', color: '#42f593', fontWeight: 700 }}>{row.gate || row.belt}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 800, color: row.status.includes('CẤT CÁNH') || row.status.includes('HẠ CÁNH') ? '#10b981' : '#f59e0b' }}>
                          {row.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: '#5de6ff', fontSize: 13 }}>
                  ⚓ Dữ liệu luồng hải cảng được cập nhật tự động qua trạm AIS hàng hải.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {inspectedWeather && (
        <div style={{
          position: 'absolute',
          bottom: 30,
          right: 20,
          background: 'rgba(4, 13, 26, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(93, 230, 255, 0.4)',
          borderRadius: 16,
          padding: 16,
          zIndex: 1000,
          width: 260,
          color: '#ffffff',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#5de6ff', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fa-solid fa-location-dot"></i>
              THỜI TIẾT TẠI TỌA ĐỘ
            </div>
            <button 
              onClick={() => setInspectedWeather(null)}
              style={{ background: 'none', border: 'none', color: '#ff5d8f', fontSize: 12, cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          <div style={{ fontSize: 10, color: '#587094', marginBottom: 10 }}>
            Vĩ độ: {inspectedWeather.lat}° | Kinh độ: {inspectedWeather.lng}°
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 9, color: '#587094', fontWeight: 700 }}>NHIỆT ĐỘ</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#ff5d8f', marginTop: 2 }}>
                {inspectedWeather.temp}°C
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 9, color: '#587094', fontWeight: 700 }}>TỐC ĐỘ GIÓ</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#42f593', marginTop: 2 }}>
                {inspectedWeather.windSpeed} <span style={{ fontSize: 10 }}>km/h</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 8, fontSize: 10, color: '#d8e3fb', textAlign: 'center' }}>
            💨 Hướng gió: {inspectedWeather.windDir}°
          </div>
        </div>
      )}
      {weatherMode !== 'none' && (
        <div style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(4, 13, 26, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(93, 230, 255, 0.3)',
          borderRadius: 20,
          padding: '8px 16px',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: '#5de6ff',
          fontSize: 12,
          fontWeight: 700,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
          <i className="fa-solid fa-cloud-rain fa-bounce"></i>
          <span>{weatherStatusText || 'Đang kích hoạt lớp radar thời tiết...'}</span>
          <button 
            onClick={() => handleSwitchWeather('none')}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#ff5d8f',
              borderRadius: '50%',
              width: 20,
              height: 20,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              marginLeft: 4
            }}
            title="Tắt lớp thời tiết"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. UNIFIED COLLAPSIBLE LEFT VERTICAL NAVIGATOR */}
      <div className="glass-panel" style={{
        position: 'absolute',
        top: 20,
        left: 20,
        bottom: 20,
        width: isNavOpen ? 340 : 64,
        borderRadius: 20,
        padding: isNavOpen ? 20 : 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        zIndex: 1000,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        {/* NAV BAR HEADER & COLLAPSE TOGGLE BUTTON */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <i className="fa-solid fa-radar fa-spin" style={{ color: activeMode === 'flights' ? '#5de6ff' : '#10b981', fontSize: 22, minWidth: 22 }}></i>
            {isNavOpen && (
              <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Outfit, sans-serif', whiteSpace: 'nowrap' }} className="text-gradient">
                TE Radar System
              </span>
            )}
          </div>
          <button 
            onClick={() => setIsNavOpen(!isNavOpen)}
            title={isNavOpen ? "Thu gọn menu" : "Mở rộng menu"}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#5de6ff',
              width: 32,
              height: 32,
              minWidth: 32,
              borderRadius: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(93, 230, 255, 0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          >
            <i className={isNavOpen ? "fa-solid fa-chevron-left" : "fa-solid fa-chevron-right"}></i>
          </button>
        </div>

        <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }}></div>

        {/* MODE SWITCHER TABS (FLIGHTS / SHIPS / FIDS BOARD) */}
        {isNavOpen ? (
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', padding: 4, borderRadius: 12 }}>
            <button 
              onClick={() => setActiveMode('flights')}
              style={{
                flex: 1,
                background: activeMode === 'flights' ? 'linear-gradient(135deg, #5de6ff, #3b82f6)' : 'transparent',
                border: 'none',
                color: activeMode === 'flights' ? '#040d1a' : '#d8e3fb',
                padding: '8px 6px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
            >
              <i className="fa-solid fa-plane"></i>
              Máy Bay
            </button>
            
            <button 
              onClick={() => setActiveMode('ships')}
              style={{
                flex: 1,
                background: activeMode === 'ships' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
                border: 'none',
                color: activeMode === 'ships' ? '#ffffff' : '#d8e3fb',
                padding: '8px 6px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
            >
              <i className="fa-solid fa-ship"></i>
              Tàu Biển
            </button>

            <button 
              onClick={() => handleOpenFidsModal({ code: 'SGN', name: 'Tân Sơn Nhất', type: 'airport' })}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(239, 68, 68, 0.2))',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#ffb35d',
                padding: '8px 6px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
            >
              <i className="fa-solid fa-list-check"></i>
              Bảng FIDS
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <button 
              onClick={() => setActiveMode('flights')}
              title={`Radar Máy Bay (${flights.length})`}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                border: 'none',
                background: activeMode === 'flights' ? 'linear-gradient(135deg, #5de6ff, #3b82f6)' : 'rgba(255,255,255,0.04)',
                color: activeMode === 'flights' ? '#040d1a' : '#d8e3fb',
                fontSize: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className="fa-solid fa-plane"></i>
            </button>

            <button 
              onClick={() => setActiveMode('ships')}
              title="Radar Tàu Biển (Live AIS)"
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                border: 'none',
                background: activeMode === 'ships' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.04)',
                color: activeMode === 'ships' ? '#ffffff' : '#d8e3fb',
                fontSize: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className="fa-solid fa-ship"></i>
            </button>

            <button 
              onClick={() => handleOpenFidsModal({ code: 'SGN', name: 'Tân Sơn Nhất', type: 'airport' })}
              title="Bảng Điện tử FIDS LED Sân bay"
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                border: '1px solid rgba(245, 158, 11, 0.4)',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#ffb35d',
                fontSize: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className="fa-solid fa-list-check"></i>
            </button>
          </div>
        )}

        {/* MAP STYLE SELECTOR (FOR LEAFLET MODES) */}
        {(activeMode === 'flights' || activeMode === 'ships_leaflet') && (
          isNavOpen ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: '#587094' }}>CHẾ ĐỘ BẢN ĐỒ</label>
              <div style={{ display: 'flex', gap: 4, background: 'rgba(4,13,26,0.5)', padding: 3, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                <button 
                  onClick={() => handleSwitchStyle('dark')}
                  style={{
                    flex: 1,
                    background: mapStyle === 'dark' ? 'rgba(93, 230, 255, 0.2)' : 'transparent',
                    border: 'none',
                    color: mapStyle === 'dark' ? '#5de6ff' : '#587094',
                    padding: '6px 4px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: 700,
                    outline: 'none'
                  }}
                >
                  Radar Tối
                </button>
                <button 
                  onClick={() => handleSwitchStyle('hybrid')}
                  style={{
                    flex: 1,
                    background: mapStyle === 'hybrid' ? 'rgba(93, 230, 255, 0.2)' : 'transparent',
                    border: 'none',
                    color: mapStyle === 'hybrid' ? '#5de6ff' : '#587094',
                    padding: '6px 4px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: 700,
                    outline: 'none'
                  }}
                >
                  Vệ tinh
                </button>
                <button 
                  onClick={() => handleSwitchStyle('streets')}
                  style={{
                    flex: 1,
                    background: mapStyle === 'streets' ? 'rgba(93, 230, 255, 0.2)' : 'transparent',
                    border: 'none',
                    color: mapStyle === 'streets' ? '#5de6ff' : '#587094',
                    padding: '6px 4px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: 700,
                    outline: 'none'
                  }}
                >
                  Đường phố
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button 
                onClick={() => handleSwitchStyle(mapStyle === 'dark' ? 'hybrid' : mapStyle === 'hybrid' ? 'streets' : 'dark')}
                title={`Đổi bản đồ (Hiện tại: ${mapStyle})`}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#5de6ff',
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <i className="fa-solid fa-layer-group"></i>
              </button>
            </div>
          )
        )}

        {/* WEATHER RADAR CONTROLS (FOR LEAFLET MODES) */}
        {(activeMode === 'flights' || activeMode === 'ships_leaflet') && (
          isNavOpen ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: '#587094' }}>RADAR THỜI TIẾT & NHIỆT ĐỘ</label>
              <div style={{ display: 'flex', gap: 4, background: 'rgba(4,13,26,0.5)', padding: 3, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                <button 
                  onClick={() => handleSwitchWeather('rain')}
                  title="Ra-đa Mây & Mưa thời gian thực"
                  style={{
                    flex: 1,
                    background: weatherMode === 'rain' ? 'rgba(93, 230, 255, 0.25)' : 'transparent',
                    border: weatherMode === 'rain' ? '1px solid #5de6ff' : '1px solid transparent',
                    color: weatherMode === 'rain' ? '#5de6ff' : '#d8e3fb',
                    padding: '6px 4px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: 700,
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🌧️ Mây/Mưa
                </button>
                <button 
                  onClick={() => handleSwitchWeather('temp')}
                  title="Bản đồ Nhiệt độ Gradient (°C)"
                  style={{
                    flex: 1,
                    background: weatherMode === 'temp' ? 'rgba(239, 68, 68, 0.25)' : 'transparent',
                    border: weatherMode === 'temp' ? '1px solid #ef4444' : '1px solid transparent',
                    color: weatherMode === 'temp' ? '#fca5a5' : '#d8e3fb',
                    padding: '6px 4px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: 700,
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🌡️ Nhiệt độ
                </button>
                <button 
                  onClick={() => handleSwitchWeather('wind')}
                  title="Bản đồ Tốc độ & Hướng gió"
                  style={{
                    flex: 1,
                    background: weatherMode === 'wind' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                    border: weatherMode === 'wind' ? '1px solid #10b981' : '1px solid transparent',
                    color: weatherMode === 'wind' ? '#6ee7b7' : '#d8e3fb',
                    padding: '6px 4px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: 700,
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  💨 Gió
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button 
                onClick={() => handleSwitchWeather(weatherMode === 'none' ? 'rain' : weatherMode === 'rain' ? 'temp' : weatherMode === 'temp' ? 'wind' : 'none')}
                title={`Thời tiết (${weatherMode})`}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: weatherMode !== 'none' ? 'rgba(93, 230, 255, 0.2)' : 'rgba(255,255,255,0.04)',
                  color: weatherMode !== 'none' ? '#5de6ff' : '#587094',
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <i className="fa-solid fa-cloud-sun-rain"></i>
              </button>
            </div>
          )
        )}

        {/* SEARCH & AIRPORT PRESETS & FLIGHT LIST (ONLY WHEN EXPANDED AND IN FLIGHTS MODE) */}
        {activeMode === 'flights' && isNavOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', flex: 1, paddingRight: 2 }}>
            <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }}></div>

            {/* 3D ALTITUDE TRAIL LEGEND */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: '#587094' }}>
                CHÚ GIẢI ĐỘ CAO CHẮNG BAY 3D
              </label>
              <div style={{
                background: 'rgba(4,13,26,0.6)',
                borderRadius: 10,
                padding: '8px 10px',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 10,
                color: '#d8e3fb'
              }}>
                <div 
                  title="Dưới 10,000 FT (Dưới 3,050m / 3.0 km) — Giai đoạn Cất cánh hoặc Hạ cánh"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'help', padding: '2px 4px', borderRadius: 4, transition: 'background 0.2s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }}></span>
                  <span>&lt; 10k FT</span>
                </div>
                <div 
                  title="Từ 10,000 FT - 25,000 FT (3,050m đến 7,620m / 3 - 7.6 km) — Giai đoạn Tăng độ cao hoặc Hạ độ cao"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'help', padding: '2px 4px', borderRadius: 4, transition: 'background 0.2s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 6px #f59e0b' }}></span>
                  <span>10k-25k FT</span>
                </div>
                <div 
                  title="Trên 25,000 FT (Trên 7,620m / 7.6 km đến 12 km) — Giai đoạn Bay bằng Cao không (Cruising)"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'help', padding: '2px 4px', borderRadius: 4, transition: 'background 0.2s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(93, 230, 255, 0.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#5de6ff', boxShadow: '0 0 6px #5de6ff' }}></span>
                  <span>&gt; 25k FT</span>
                </div>
              </div>
            </div>

            {/* SEARCH & VISIBILITY TOGGLE & COUNTRY AIRLINE FILTERS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: '#587094' }}>
                  TÌM KIẾM & BỘ LỌC HÃNG BAY
                </label>
                <button 
                  onClick={() => setShowFlights(!showFlights)}
                  style={{
                    background: showFlights ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: showFlights ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    color: showFlights ? '#10b981' : '#ef4444',
                    borderRadius: 6,
                    padding: '2px 6px',
                    fontSize: 9,
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                  title={showFlights ? "Ẩn tất cả máy bay trên bản đồ" : "Hiện lại tất cả máy bay trên bản đồ"}
                >
                  <i className={showFlights ? "fa-solid fa-eye" : "fa-solid fa-eye-slash"} style={{ marginRight: 4 }}></i>
                  {showFlights ? "Đang Hiện" : "Đã Ẩn"}
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  placeholder="Nhập Callsign hoặc Airline..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-well"
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    fontSize: 12,
                    boxSizing: 'border-box'
                  }}
                />
                <i className="fa-solid fa-magnifying-glass" style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#587094',
                  fontSize: 11
                }}></i>
              </div>

              {/* COUNTRY / AIRLINE FILTER PILLS */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                {AIRLINE_FILTERS.map(af => (
                  <button
                    key={af.id}
                    onClick={() => setSelectedAirlineFilter(af.id)}
                    style={{
                      background: selectedAirlineFilter === af.id ? 'rgba(93, 230, 255, 0.2)' : 'rgba(255,255,255,0.03)',
                      border: selectedAirlineFilter === af.id ? '1px solid #5de6ff' : '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 6,
                      color: selectedAirlineFilter === af.id ? '#5de6ff' : '#d8e3fb',
                      padding: '3px 7px',
                      fontSize: 10,
                      fontWeight: selectedAirlineFilter === af.id ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  >
                    <span style={{ marginRight: 3 }}>{af.flag}</span>
                    {af.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: '#587094' }}>
                  SÂN BAY TRỌNG ĐIỂM
                </label>
                <button
                  onClick={() => handleOpenFidsModal({ code: 'SGN', name: 'Tân Sơn Nhất', type: 'airport' })}
                  style={{
                    background: 'rgba(93, 230, 255, 0.1)',
                    border: '1px solid rgba(93, 230, 255, 0.3)',
                    color: '#5de6ff',
                    borderRadius: 6,
                    padding: '2px 6px',
                    fontSize: 9,
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                  title="Mở Bảng Điện tử Cất/Hạ cánh Sân bay"
                >
                  <i className="fa-solid fa-[#5de6ff] fa-list-check" style={{ marginRight: 3 }}></i>
                  📋 Bảng FIDS LED
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {AIRPORTS.map(ap => (
                  <button 
                    key={ap.code}
                    onClick={() => { handleGoToAirport(ap); handleOpenFidsModal({ code: ap.code, name: ap.name, type: 'airport' }); }}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 6,
                      color: '#d8e3fb',
                      padding: '3px 7px',
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(93, 230, 255, 0.1)'; e.currentTarget.style.borderColor = 'rgba(93, 230, 255, 0.3)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                  >
                    <i className="fa-solid fa-plane-departure" style={{ marginRight: 3, fontSize: 8 }}></i>
                    {ap.code}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }}></div>

            {/* SCAN STATISTICS */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 12,
              padding: 10,
              border: '1px solid rgba(255,255,255,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#5de6ff' }}>{stats.total}</div>
                  <div style={{ fontSize: 8, color: '#587094', fontWeight: 700 }}>TỔNG SỐ</div>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#42f593' }}>{stats.airborne}</div>
                  <div style={{ fontSize: 8, color: '#587094', fontWeight: 700 }}>ĐANG BAY</div>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#ffb35d' }}>{stats.ground}</div>
                  <div style={{ fontSize: 8, color: '#587094', fontWeight: 700 }}>DƯỚI ĐẤT</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SHIP RADAR SIDEBAR CONTENT (ONLY WHEN IN SHIPS MODE AND EXPANDED) */}
        {activeMode === 'ships' && isNavOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1, paddingRight: 2 }}>
            <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }}></div>

            {/* SEAPORT PRESETS & PORT CONGESTION ANALYTICS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fa-solid fa-anchor"></i>
                  ĐỊNH VỊ CẢNG BIỂN TRỌNG ĐIỂM
                </label>
                <button
                  onClick={() => handleOpenFidsModal({ code: 'HAI PHONG', name: 'Hải Phòng', type: 'port' })}
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#42f593',
                    borderRadius: 6,
                    padding: '2px 6px',
                    fontSize: 9,
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                  title="Mở Bảng Thống kê Mật độ Cảng Biển"
                >
                  ⚓ Thống kê Cảng
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {SEAPORTS.map(port => (
                  <button 
                    key={port.code}
                    onClick={() => {
                      setShipMapCenter({ lat: port.lat, lon: port.lon, zoom: port.zoom });
                      handleOpenFidsModal({ code: port.code, name: port.name, type: 'port' });
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 8,
                      color: '#d8e3fb',
                      padding: '8px 10px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)'; e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="fa-solid fa-anchor" style={{ color: '#42f593' }}></i>
                      {port.name}
                    </span>
                    <span style={{ fontSize: 10, color: '#587094', fontWeight: 600 }}>Chi tiết 📊</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }}></div>

            {/* AIS VESSEL COLOR LEGEND */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: '#587094', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="fa-solid fa-palette"></i>
                CHÚ GIẢI PHÂN LOẠI TÀU BIỂN
              </label>
              
              <div style={{
                background: 'rgba(4,13,26,0.6)',
                borderRadius: 12,
                padding: 12,
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#d8e3fb' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#eab308', boxShadow: '0 0 6px rgba(234, 179, 8, 0.8)' }}></span>
                  <span>Tàu chở hàng</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#d8e3fb' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px rgba(16, 185, 129, 0.8)' }}></span>
                  <span>Tàu chở dầu</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#d8e3fb' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 6px rgba(59, 130, 246, 0.8)' }}></span>
                  <span>Tàu du lịch</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#d8e3fb' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f97316', boxShadow: '0 0 6px rgba(249, 115, 22, 0.8)' }}></span>
                  <span>Tàu kéo/Đặc chủng</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#d8e3fb' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 6px rgba(168, 85, 247, 0.8)' }}></span>
                  <span>Tàu đánh cá</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#d8e3fb' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#94a3b8', boxShadow: '0 0 6px rgba(148, 163, 184, 0.8)' }}></span>
                  <span>Đang thả neo</span>
                </div>
              </div>
            </div>

            {/* INTERACTIVE VESSEL INFO TIP BOX */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05))',
              borderRadius: 12,
              padding: 12,
              border: '1px solid rgba(16, 185, 129, 0.2)',
              marginTop: 'auto'
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#10b981', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="fa-solid fa-circle-info"></i>
                MẸO XEM THÔNG TIN CHI TIẾT
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
                Click chuột trực tiếp vào bất kỳ con tàu nào trên bản đồ để mở <b>Card Thông tin Chi tiết</b> (Ảnh chụp thật con tàu, cờ quốc gia, tốc độ hải lý, hải trình & hành trình xuất phát).
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. FLIGHT INFO PANEL (RIGHT SIDEBAR) */}
      {selectedFlight && (
        <div className="glass-panel radar-spinner" style={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: 360,
          borderRadius: 16,
          padding: 24,
          zIndex: 1000,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }}>
          {/* Header of Sidebar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge-neon" style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>
                  {selectedFlight.icao.toUpperCase()}
                </span>
                <span style={{ fontSize: 11, color: '#587094', fontWeight: 600 }}>
                  {selectedFlight.country}
                </span>
              </div>
              <h2 style={{ margin: '8px 0 2px 0', fontSize: 28, fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>
                {selectedFlight.callsign}
              </h2>
              <div style={{ fontSize: 13, color: '#5de6ff', fontWeight: 600 }}>
                {selectedFlight.airline}
              </div>
            </div>
            
            <button 
              onClick={() => setSelectedFlight(null)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                color: '#587094',
                width: 32,
                height: 32,
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255,93,143,0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#587094'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', position: 'relative', zIndex: 1 }}></div>

          {/* Core Flight Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, position: 'relative', zIndex: 1 }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: 10, color: '#587094', fontWeight: 600, marginBottom: 4 }}>ĐỘ CAO</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#ffffff' }}>
                {selectedFlight.altitude_ft.toLocaleString()} <span style={{ fontSize: 11, fontWeight: 500, color: '#587094' }}>FT</span>
              </div>
              <div style={{ fontSize: 11, color: '#5de6ff', marginTop: 2 }}>
                ~ {Math.round(selectedFlight.altitude_m).toLocaleString()} m
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: 10, color: '#587094', fontWeight: 600, marginBottom: 4 }}>TỐC ĐỘ BAY</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#ffffff' }}>
                {selectedFlight.speed_kmh} <span style={{ fontSize: 11, fontWeight: 500, color: '#587094' }}>KM/H</span>
              </div>
              <div style={{ fontSize: 11, color: '#5de6ff', marginTop: 2 }}>
                ~ {Math.round(selectedFlight.speed_kmh / 1.852)} knots
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: 10, color: '#587094', fontWeight: 600, marginBottom: 4 }}>HƯỚNG BAY (HEADING)</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#ffffff' }}>
                {Math.round(selectedFlight.heading)}°
              </div>
              <div style={{ fontSize: 11, color: '#5de6ff', marginTop: 2 }}>
                <i className="fa-solid fa-compass" style={{ marginRight: 4 }}></i>
                {selectedFlight.heading >= 337.5 || selectedFlight.heading < 22.5 ? 'Bắc (N)' :
                 selectedFlight.heading >= 22.5 && selectedFlight.heading < 67.5 ? 'Đông Bắc (NE)' :
                 selectedFlight.heading >= 67.5 && selectedFlight.heading < 112.5 ? 'Đông (E)' :
                 selectedFlight.heading >= 112.5 && selectedFlight.heading < 157.5 ? 'Đông Nam (SE)' :
                 selectedFlight.heading >= 157.5 && selectedFlight.heading < 202.5 ? 'Nam (S)' :
                 selectedFlight.heading >= 202.5 && selectedFlight.heading < 247.5 ? 'Tây Nam (SW)' :
                 selectedFlight.heading >= 247.5 && selectedFlight.heading < 292.5 ? 'Tây (W)' : 'Tây Bắc (NW)'}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: 10, color: '#587094', fontWeight: 600, marginBottom: 4 }}>TỐC ĐỘ LÊN/XUỐNG</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: selectedFlight.vertical_rate_ms > 0 ? '#42f593' : selectedFlight.vertical_rate_ms < 0 ? '#ff5d8f' : '#ffffff' }}>
                {selectedFlight.vertical_rate_ms > 0 ? '+' : ''}{selectedFlight.vertical_rate_ms} <span style={{ fontSize: 11, fontWeight: 500, color: '#587094' }}>M/S</span>
              </div>
              <div style={{ fontSize: 11, color: '#5de6ff', marginTop: 2 }}>
                {selectedFlight.vertical_rate_ms > 0 ? 'Đang lên độ cao' : selectedFlight.vertical_rate_ms < 0 ? 'Đang hạ cánh' : 'Bay bằng'}
              </div>
            </div>
          </div>

          {/* Status Indicator */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            background: 'rgba(255,255,255,0.02)', 
            padding: '12px 16px', 
            borderRadius: 12,
            position: 'relative',
            zIndex: 1
          }}>
            <span style={{ fontSize: 12, color: '#587094', fontWeight: 600 }}>TRẠNG THÁI:</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: selectedFlight.on_ground ? '#ffb35d' : '#42f593' }}>
              <i className={selectedFlight.on_ground ? "fa-solid fa-plane-arrival" : "fa-solid fa-plane-departure"} style={{ marginRight: 6 }}></i>
              {selectedFlight.on_ground ? 'DƯỚI ĐẤT (ON GROUND)' : 'ĐANG BAY (AIRBORNE)'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, position: 'relative', zIndex: 1 }}>
            <button 
              onClick={handleCenterOnSelected}
              className="btn-glow"
              style={{
                flex: 1,
                padding: '12px 20px',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              <i className="fa-solid fa-crosshairs"></i>
              ĐỊNH VỊ MÁY BAY
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
