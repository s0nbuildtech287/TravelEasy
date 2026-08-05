<!--
frontend/my-vietnam-map/src/components/Map.svelte
-->
<script>
  import { onMount } from "svelte";
  import { 
    selectedProvince, 
    touristPlaces, 
    selectedPlace, 
    nearbyHotels, 
    nearbyEateries, 
    userLocation 
  } from "../stores.js";

  let map;
  let mapElement;
  let markerGroup;
  let userMarker;
  let L;

  // Custom icons (HTML based for beautiful glowing styling)
  let spotIcon, hotelIcon, eateryIcon, userIcon;

  onMount(async () => {
    // Import Leaflet động để tránh lỗi SSR/Vite
    L = await import("leaflet");

    // Fix lỗi hiển thị icon mặc định của Leaflet trên Vite
    const DefaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });
    L.Marker.prototype.options.icon = DefaultIcon;

    // Tạo các custom marker icons
    spotIcon = L.divIcon({
      className: 'custom-pin spot-pin',
      html: '<div class="pin-icon">🏛️</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -30]
    });

    hotelIcon = L.divIcon({
      className: 'custom-pin hotel-pin',
      html: '<div class="pin-icon">🏨</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -30]
    });

    eateryIcon = L.divIcon({
      className: 'custom-pin eatery-pin',
      html: '<div class="pin-icon">🍕</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -30]
    });

    userIcon = L.divIcon({
      className: 'user-pulse-marker',
      html: '<div class="pulse-ring"></div><div class="pulse-dot"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10]
    });

    // Khởi tạo bản đồ tại toạ độ Việt Nam (Đà Nẵng làm trung tâm)
    map = L.map(mapElement).setView([16.047079, 108.206230], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    markerGroup = L.layerGroup().addTo(map);

    // Zoom thử tới tỉnh đã được chọn nếu có
    if ($selectedProvince) {
      flyToProvince($selectedProvince);
    }
  });

  // Theo dõi sự thay đổi của toạ độ người dùng để vẽ ghim
  $: if (map && $userLocation) {
    updateUserLocation($userLocation);
  }

  // Theo dõi các địa điểm xung quanh thay đổi (tourism, hotels, eateries)
  $: if (map && markerGroup && ($touristPlaces || $nearbyHotels || $nearbyEateries || $selectedPlace)) {
    updateMarkers($touristPlaces, $nearbyHotels, $nearbyEateries, $selectedPlace);
  }

  // Theo dõi việc đổi tỉnh từ sidebar
  $: if (map && $selectedProvince) {
    flyToProvince($selectedProvince);
  }

  function updateUserLocation(loc) {
    if (!L || !map) return;
    if (userMarker) {
      userMarker.setLatLng([loc.lat, loc.lng]);
    } else {
      userMarker = L.marker([loc.lat, loc.lng], { icon: userIcon }).addTo(map);
      userMarker.bindPopup("<b>Vị trí hiện tại của bạn</b>");
    }
    map.setView([loc.lat, loc.lng], 14);
  }

  function updateMarkers(spots, hotels, eateries, selectedSpot) {
    if (!L || !markerGroup) return;
    markerGroup.clearLayers();

    // 1. Ghim các địa điểm du lịch
    spots.forEach(p => {
      if (p.latitude && p.longitude) {
        const marker = L.marker([p.latitude, p.longitude], { icon: spotIcon })
          .addTo(markerGroup)
          .bindPopup(`
            <div class="map-popup">
              <h4 style="color: #28a745; margin: 0 0 5px 0;">${p.name}</h4>
              <p style="font-size: 12px; margin: 0 0 5px 0; color: #666;">${p.address || ''}</p>
              <p style="font-size: 11px; margin: 0;">⭐ ${p.rating || 0} (${p.review_count || 0} đánh giá)</p>
            </div>
          `);

        if (selectedSpot && selectedSpot.id === p.id) {
          marker.openPopup();
          map.setView([p.latitude, p.longitude], 14);
        }
      }
    });

    // 2. Ghim các khách sạn xung quanh
    hotels.forEach(h => {
      if (h.latitude && h.longitude) {
        L.marker([h.latitude, h.longitude], { icon: hotelIcon })
          .addTo(markerGroup)
          .bindPopup(`
            <div class="map-popup">
              <h4 style="color: #17a2b8; margin: 0 0 5px 0;">${h.hotel}</h4>
              <p style="font-size: 12px; margin: 0 0 5px 0; color: #666;">${h.address || ''}</p>
              <p style="font-size: 11px; margin: 0 0 5px 0; font-style: italic;">${h.description || ''}</p>
              <a href="${h.link}" target="_blank" class="popup-link">Xem trên Google Maps</a>
            </div>
          `);
      }
    });

    // 3. Ghim các quán ăn xung quanh (Google Places)
    eateries.forEach(e => {
      if (e.latitude && e.longitude) {
        L.marker([e.latitude, e.longitude], { icon: eateryIcon })
          .addTo(markerGroup)
          .bindPopup(`
            <div class="map-popup">
              <h4 style="color: #dc3545; margin: 0 0 5px 0;">${e.name}</h4>
              <p style="font-size: 12px; margin: 0 0 5px 0; color: #666;">${e.address || ''}</p>
              <p style="font-size: 11px; margin: 0 0 5px 0;">⭐ ${e.rating || 0} (${e.review_count || 0} đánh giá)</p>
              <a href="${e.google_maps_link}" target="_blank" class="popup-link">Xem trên Google Maps</a>
            </div>
          `);
      }
    });
  }

  function flyToProvince(provName) {
    if (!map) return;

    // 1. Thử bay tới tọa độ của địa điểm du lịch đầu tiên trong danh sách của tỉnh đó
    const spots = $touristPlaces;
    const matchedSpot = spots.find(s => s.province && s.province.toLowerCase().includes(provName.toLowerCase()));
    if (matchedSpot && matchedSpot.latitude && matchedSpot.longitude) {
      map.setView([matchedSpot.latitude, matchedSpot.longitude], 12);
      return;
    }

    // 2. Mảng tọa độ dự phòng cho các tỉnh chính
    const PROVINCE_COORDS = {
      "Hà Nội": [21.0285, 105.8542],
      "TP Hồ Chí Minh": [10.8231, 106.6297],
      "Đà Nẵng": [16.0471, 108.2062],
      "Hải Phòng": [20.8449, 106.6881],
      "Cần Thơ": [10.0452, 105.7469],
      "Lào Cai": [22.4856, 103.9707],
      "Hà Giang": [22.8233, 104.9836],
      "Quảng Ninh": [21.0063, 107.2925],
      "Ninh Bình": [20.2506, 105.9745],
      "Thừa Thiên Huế": [16.4637, 107.5909],
      "Quảng Nam": [15.5862, 108.0125],
      "Khánh Hòa": [12.2471, 109.1967],
      "Lâm Đồng": [11.9404, 108.4583],
      "Bà Rịa - Vũng Tàu": [10.4114, 107.1359],
      "An Giang": [10.5365, 105.1278],
      "Kiên Giang": [9.9723, 105.1259],
      "Bình Thuận": [11.0822, 108.1362],
      "Quảng Bình": [17.4687, 106.5982],
      "Cao Bằng": [22.6738, 106.2625],
      "Bắc Kạn": [22.2965, 105.8285],
      "Lạng Sơn": [21.8548, 106.7613],
      "Tuyên Quang": [21.8193, 105.2132],
    };

    const coords = PROVINCE_COORDS[provName];
    if (coords) {
      map.setView(coords, 10);
    }
  }
</script>

<svelte:head>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

<div class="map-wrapper">
  <div bind:this={mapElement} class="leaflet-map-container"></div>
</div>

<style>
  .map-wrapper {
    width: 100%;
    height: 100%;
    background: #0f172a;
  }

  .leaflet-map-container {
    width: 100%;
    height: 100%;
    z-index: 1;
  }

  /* Custom Leaflet Pin Styling */
  :global(.custom-pin) {
    display: flex !important;
    align-items: center;
    justify-content: center;
    background: white;
    border: 2.5px solid #555;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    width: 32px !important;
    height: 32px !important;
    box-shadow: 0 4px 10px rgba(0,0,0,0.25);
    transition: all 0.2s ease;
  }
  :global(.custom-pin:hover) {
    transform: rotate(-45deg) scale(1.15);
    box-shadow: 0 6px 15px rgba(0,0,0,0.3);
  }

  :global(.pin-icon) {
    transform: rotate(45deg);
    font-size: 18px;
  }

  :global(.spot-pin) {
    border-color: #28a745 !important;
  }

  :global(.hotel-pin) {
    border-color: #17a2b8 !important;
  }

  :global(.eatery-pin) {
    border-color: #dc3545 !important;
  }

  /* User pulse marker styling */
  :global(.user-pulse-marker) {
    position: relative;
  }
  :global(.pulse-ring) {
    border: 3px solid #007bff;
    border-radius: 50%;
    height: 30px;
    width: 30px;
    position: absolute;
    left: -5px;
    top: -5px;
    animation: pulsate 1.6s ease-out infinite;
    opacity: 0;
  }
  :global(.pulse-dot) {
    background: #007bff;
    border: 2px solid white;
    border-radius: 50%;
    height: 14px;
    width: 14px;
    position: absolute;
    left: 3px;
    top: 3px;
    box-shadow: 0 0 10px rgba(0,123,255,0.6);
  }
  @keyframes pulsate {
    0% { transform: scale(0.3); opacity: 0; }
    50% { opacity: 0.8; }
    100% { transform: scale(1.5); opacity: 0; }
  }

  /* Popup styling */
  :global(.leaflet-popup-content-wrapper) {
    background: rgba(8, 20, 37, 0.95) !important;
    backdrop-filter: blur(12px);
    border: 1px solid rgba(93, 230, 255, 0.15) !important;
    color: #d8e3fb !important;
    border-radius: 12px !important;
    box-shadow: 0 4px 25px rgba(0,0,0,0.5) !important;
  }
  
  :global(.leaflet-popup-tip) {
    background: rgba(8, 20, 37, 0.95) !important;
    border: 1px solid rgba(93, 230, 255, 0.15) !important;
  }

  :global(.map-popup) {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    padding: 2px;
  }
  :global(.popup-link) {
    display: inline-block;
    margin-top: 5px;
    font-size: 12px;
    font-weight: 600;
    color: #5de6ff;
    text-decoration: none;
    transition: color 0.15s ease;
  }
  :global(.popup-link:hover) {
    color: #adc6ff;
    text-decoration: underline;
  }
</style>
