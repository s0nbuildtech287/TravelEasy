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

  // Keep track of trails in a state/ref to draw paths
  const trailsRef = useRef({}); // { icao: [[lat, lng], ...] }

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

    const satelliteTile = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 18
    });

    const referenceOverlay = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Labels &copy; Esri',
      maxZoom: 18
    });

    const streetsTile = window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 20
    });

    tileLayersRef.current = {
      dark: darkTile,
      satellite: satelliteTile,
      reference: referenceOverlay,
      streets: streetsTile
    };

    // Add default (dark)
    darkTile.addTo(map);

    window.L.control.zoom({ position: 'topright' }).addTo(map);
    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleSwitchStyle = (style) => {
    const map = mapInstanceRef.current;
    const layers = tileLayersRef.current;
    if (!map || !layers.dark || !layers.satellite || !layers.reference || !layers.streets) return;

    // Clear all existing map styles from the map
    if (map.hasLayer(layers.dark)) map.removeLayer(layers.dark);
    if (map.hasLayer(layers.satellite)) map.removeLayer(layers.satellite);
    if (map.hasLayer(layers.reference)) map.removeLayer(layers.reference);
    if (map.hasLayer(layers.streets)) map.removeLayer(layers.streets);

    if (style === 'dark') {
      layers.dark.addTo(map);
    } else if (style === 'satellite') {
      layers.satellite.addTo(map);
    } else if (style === 'hybrid') {
      layers.satellite.addTo(map);
      layers.reference.addTo(map); // Add place names on top of satellite
    } else if (style === 'streets') {
      layers.streets.addTo(map);
    }
    setMapStyle(style);
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
          setFlights(list);
          
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

  // 3. Update Markers on Map
  const updateMarkers = (currentFlights) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentIcaos = new Set(currentFlights.map(f => f.icao));

    // Remove old markers for flights that left the bounding box
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
    currentFlights.forEach(flight => {
      const { icao, latitude, longitude, heading, callsign } = flight;
      
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
      const iconHtml = `<div style="transform: rotate(${heading}deg); transform-origin: center; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        ${isSelected ? PLANE_SELECTED_SVG : PLANE_SVG}
      </div>`;

      const customIcon = window.L.divIcon({
        html: iconHtml,
        className: 'custom-plane-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      if (markersRef.current[icao]) {
        // Update existing marker position & rotation icon
        const marker = markersRef.current[icao];
        marker.setLatLng([latitude, longitude]);
        marker.setIcon(customIcon);
        
        // Update trail polyline
        if (polylinesRef.current[icao]) {
          polylinesRef.current[icao].setLatLngs(trail);
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
          color: '#5de6ff',
          weight: 2,
          opacity: 0.5,
          dashArray: '5, 5'
        }).addTo(map);

        polylinesRef.current[icao] = polyline;
      }

      // If this flight is selected, dynamically style its path
      if (isSelected && polylinesRef.current[icao]) {
        polylinesRef.current[icao].setStyle({
          color: '#ff5d8f',
          weight: 3,
          opacity: 0.8
        });
      } else if (polylinesRef.current[icao]) {
        polylinesRef.current[icao].setStyle({
          color: '#5de6ff',
          weight: 2,
          opacity: 0.5
        });
      }
    });
  };

  const handleSelectFlight = (flight) => {
    setSelectedFlight(flight);
    
    // Zoom/Center to plane coords
    const map = mapInstanceRef.current;
    if (map) {
      map.setView([flight.latitude, flight.longitude], map.getZoom() < 8 ? 8 : map.getZoom());
    }
  };

  const handleCenterOnSelected = () => {
    if (!selectedFlight) return;
    const map = mapInstanceRef.current;
    if (map) {
      map.panTo([selectedFlight.latitude, selectedFlight.longitude]);
    }
  };

  // Filter flights by search input
  const filteredFlights = flights.filter(f => 
    f.callsign.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.airline.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.icao.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* 1. MAP CONTAINER */}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>

      {/* 2. TOP HUD TITLE PANEL */}
      <div className="glass-panel" style={{
        position: 'absolute',
        top: 20,
        left: 20,
        padding: '12px 24px',
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fa-solid fa-radar fa-spin" style={{ color: '#5de6ff', fontSize: 20 }}></i>
          <span style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Outfit, sans-serif' }} className="text-gradient">
            TE Flight Radar
          </span>
        </div>
        <div style={{ height: 20, width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
        <div style={{ fontSize: 12, color: '#587094', fontWeight: 600 }}>
          LIVE VIETNAM AIRSPACE
        </div>
        <div style={{ height: 20, width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
        <div style={{ display: 'flex', gap: 6, background: 'rgba(4,13,26,0.5)', padding: 3, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
          <button 
            onClick={() => handleSwitchStyle('dark')}
            style={{
              background: mapStyle === 'dark' ? 'rgba(93, 230, 255, 0.2)' : 'transparent',
              border: 'none',
              color: mapStyle === 'dark' ? '#5de6ff' : '#587094',
              padding: '6px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
          >
            <i className="fa-solid fa-circle-radiation"></i>
            Radar Tối
          </button>

          <button 
            onClick={() => handleSwitchStyle('hybrid')}
            style={{
              background: mapStyle === 'hybrid' ? 'rgba(93, 230, 255, 0.2)' : 'transparent',
              border: 'none',
              color: mapStyle === 'hybrid' ? '#5de6ff' : '#587094',
              padding: '6px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
          >
            <i className="fa-solid fa-earth-asia"></i>
            Vệ tinh (Địa danh)
          </button>

          <button 
            onClick={() => handleSwitchStyle('streets')}
            style={{
              background: mapStyle === 'streets' ? 'rgba(93, 230, 255, 0.2)' : 'transparent',
              border: 'none',
              color: mapStyle === 'streets' ? '#5de6ff' : '#587094',
              padding: '6px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
          >
            <i className="fa-solid fa-map-location-dot"></i>
            Đường phố
          </button>
        </div>
      </div>

      {/* 3. FLIGHT LIST & SEARCH SIDEBAR (LEFT) */}
      <div className="glass-panel" style={{
        position: 'absolute',
        top: 90,
        left: 20,
        width: 320,
        maxHeight: 'calc(100vh - 240px)',
        borderRadius: 16,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: '#587094' }}>
            TÌM KIẾM CHUYẾN BAY
          </label>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Nhập Callsign hoặc Airline..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-well"
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                fontSize: 13,
                boxSizing: 'border-box'
              }}
            />
            <i className="fa-solid fa-magnifying-glass" style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#587094',
              fontSize: 12
            }}></i>
          </div>
        </div>

        <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }}></div>

        {/* FLIGHT LIST */}
        <div style={{ 
          overflowY: 'auto', 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 10,
          paddingRight: 4
        }}>
          {loading && flights.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#587094' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }}></i>
              Đang tải dữ liệu...
            </div>
          ) : filteredFlights.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#587094', fontSize: 13 }}>
              Không tìm thấy chuyến bay nào
            </div>
          ) : (
            filteredFlights.map(flight => (
              <div 
                key={flight.icao} 
                onClick={() => handleSelectFlight(flight)}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: selectedFlight && selectedFlight.icao === flight.icao 
                    ? 'rgba(93, 230, 255, 0.15)' 
                    : 'rgba(255,255,255,0.02)',
                  border: selectedFlight && selectedFlight.icao === flight.icao
                    ? '1px solid rgba(93, 230, 255, 0.4)'
                    : '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#ffffff', letterSpacing: '0.02em' }}>
                    {flight.callsign}
                  </div>
                  <div style={{ fontSize: 11, color: '#587094', marginTop: 2 }}>
                    {flight.airline}
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: '#5de6ff', fontWeight: 600 }}>
                    {flight.altitude_ft.toLocaleString()} FT
                  </div>
                  <div style={{ fontSize: 10, color: '#587094', marginTop: 2 }}>
                    {flight.speed_kmh} KM/H
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. SCAN STATISTICS BAR (BOTTOM LEFT) */}
      <div className="glass-panel" style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        width: 320,
        borderRadius: 16,
        padding: '16px 20px',
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#587094' }}>THỐNG KÊ QUÉT</span>
          <span style={{ fontSize: 11, color: '#587094' }}>Cập nhật: {lastUpdated || '---'}</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 10 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#5de6ff' }}>{stats.total}</div>
            <div style={{ fontSize: 9, color: '#587094', marginTop: 2, fontWeight: 600 }}>TỔNG SỐ</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 10 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#42f593' }}>{stats.airborne}</div>
            <div style={{ fontSize: 9, color: '#587094', marginTop: 2, fontWeight: 600 }}>ĐANG BAY</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 10 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#ffb35d' }}>{stats.ground}</div>
            <div style={{ fontSize: 9, color: '#587094', marginTop: 2, fontWeight: 600 }}>DƯỚI ĐẤT</div>
          </div>
        </div>
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
