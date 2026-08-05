<!---
frontend/src/App.svelte
-->
<script>
  import Map from "./components/Map.svelte";
  import Info from "./components/Info.svelte";
  import { selectedProvince, userLocation, touristPlaces, nearbyHotels, nearbyEateries } from "./stores.js";

  let activeTab = "itinerary"; // 'itinerary' | 'foods' | 'search'

  // Reset function to clear results
  function handleReset() {
    selectedProvince.set(null);
    touristPlaces.set([]);
    nearbyHotels.set([]);
    nearbyEateries.set([]);
  }

  // Get User Geolocation GPS
  function handleGetLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          userLocation.set({ lat, lng });
          activeTab = "foods"; // Switch to food tab automatically
        },
        (error) => {
          alert("Không thể lấy vị trí GPS của bạn. Hãy chắc chắn rằng bạn đã cho phép truy cập vị trí.");
          console.error(error);
        }
      );
    } else {
      alert("Trình duyệt của bạn không hỗ trợ định vị GPS.");
    }
  }
</script>

<header class="glass">
  <div class="header-container">
    <div class="logo" on:click={handleReset}>
      <span class="logo-icon">✈️</span>
      <span class="logo-text text-gradient">TravelEasy</span>
    </div>

    <nav>
      <button 
        class="nav-link {activeTab === 'itinerary' ? 'active' : ''}" 
        on:click={() => activeTab = "itinerary"}
      >
        🤖 Lịch Trình AI
      </button>
      <button 
        class="nav-link {activeTab === 'foods' ? 'active' : ''}" 
        on:click={() => activeTab = "foods"}
      >
        🍕 Ăn Uống Gần Đây
      </button>
      <button 
        class="nav-link {activeTab === 'search' ? 'active' : ''}" 
        on:click={() => activeTab = "search"}
      >
        🔍 Khám Phá Địa Điểm
      </button>
    </nav>

    <div class="actions">
      <button class="btn-location glass" on:click={handleGetLocation}>
        📍 Định vị GPS của tôi
      </button>
    </div>
  </div>
</header>

<main>
  <div class="sidebar-container glass">
    <Info {activeTab} />
  </div>

  <div class="map-container">
    <Map />
  </div>
</main>

<style>
  :global(body) {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  header {
    height: 70px;
    width: 100%;
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .header-container {
    max-width: 1600px;
    width: 100%;
    margin: 0 auto;
    padding: 0 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 22px;
    font-weight: 700;
  }

  nav {
    display: flex;
    gap: 8px;
  }

  .nav-link {
    background: transparent;
    border: none;
    color: #94a3b8;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 600;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .nav-link:hover {
    color: #f1f5f9;
    background: rgba(255, 255, 255, 0.03);
  }

  .nav-link.active {
    color: white;
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  .btn-location {
    font-size: 13px;
    color: #60a5fa;
    border: 1px solid rgba(96, 165, 250, 0.2);
    padding: 8px 16px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-location:hover {
    background: rgba(96, 165, 250, 0.1);
    border-color: #60a5fa;
  }

  main {
    flex: 1;
    display: flex;
    height: calc(100vh - 70px);
    overflow: hidden;
  }

  .sidebar-container {
    width: 480px;
    height: 100%;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 0;
    display: flex;
    flex-direction: column;
    z-index: 5;
  }

  .map-container {
    flex: 1;
    height: 100%;
    position: relative;
    z-index: 1;
  }

  @media (max-width: 992px) {
    main {
      flex-direction: column-reverse;
      overflow-y: auto;
    }

    .sidebar-container {
      width: 100%;
      height: auto;
      border-right: none;
    }

    .map-container {
      width: 100%;
      height: 400px;
      flex: none;
    }
  }
</style>
