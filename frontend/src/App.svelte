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

<header class="glass-header">
  <div class="header-container">
    <div class="logo" on:click={handleReset}>
      <span class="logo-icon">✈️</span>
      <span class="logo-text text-gradient font-mono">TravelEasy</span>
    </div>

    <nav>
      <button 
        class="nav-link font-mono {activeTab === 'itinerary' ? 'active' : ''}" 
        on:click={() => activeTab = "itinerary"}
      >
        🤖 LỊCH TRÌNH AI
      </button>
      <button 
        class="nav-link font-mono {activeTab === 'foods' ? 'active' : ''}" 
        on:click={() => activeTab = "foods"}
      >
        🍕 ĂN UỐNG GẦN ĐÂY
      </button>
      <button 
        class="nav-link font-mono {activeTab === 'search' ? 'active' : ''}" 
        on:click={() => activeTab = "search"}
      >
        🔍 KHÁM PHÁ ĐỊA ĐIỂM
      </button>
    </nav>

    <div class="actions">
      <button class="btn-ghost font-mono" on:click={handleGetLocation}>
        📍 ĐỊNH VỊ GPS
      </button>
    </div>
  </div>
</header>

<main>
  <div class="sidebar-container glass-sidebar">
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
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    background: rgba(8, 20, 37, 0.7);
    backdrop-filter: blur(20px);
  }

  .header-container {
    max-width: 1600px;
    width: 100%;
    margin: 0 auto;
    padding: 0 24px;
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
    gap: 12px;
  }

  .nav-link {
    background: transparent;
    border: 1px solid transparent;
    color: #94a3b8;
    padding: 8px 16px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.05em;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .nav-link:hover {
    color: white;
    background: rgba(255, 255, 255, 0.02);
  }

  .nav-link.active {
    color: #5de6ff;
    background: rgba(93, 230, 255, 0.1);
    border-color: rgba(93, 230, 255, 0.3);
    box-shadow: 0 0 15px rgba(93, 230, 255, 0.15);
  }

  .actions .btn-ghost {
    font-size: 11px;
    padding: 8px 16px;
    letter-spacing: 0.05em;
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
    border-right: 1px solid rgba(255, 255, 255, 0.03);
    border-radius: 0;
    display: flex;
    flex-direction: column;
    z-index: 5;
    background: rgba(4, 14, 31, 0.65);
    backdrop-filter: blur(16px);
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
