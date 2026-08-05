<!--
frontend/src/components/Info.svelte
-->
<script>
  import { onMount } from "svelte";
  import { 
    selectedProvince, 
    touristPlaces, 
    selectedPlace as selectedPlaceStore, 
    nearbyHotels, 
    nearbyEateries, 
    userLocation 
  } from "../stores.js";
  import { getProvinces, getCategoryTree, getPlacesByProvinceAndCategory } from "../api/tourism.js";
  import { getHotelsNearPlace } from "../api/hotel.js";
  import { getFoodsByProvinceAndTag, getNearbyEateries } from "../api/food.js";
  import { generateItinerary } from "../api/itinerary.js";

  export let activeTab = "itinerary";

  // State lists
  let provinces = ["Hà Giang", "Hà Nội", "Đà Nẵng", "Nha Trang", "Đà Lạt", "Phú Quốc", "Hồ Chí Minh", "Sapa", "Hạ Long", "Ninh Bình", "Huế", "Hội An"];
  let availableCategories = {};
  let selectedSubcategories = [];
  
  // Selected fields
  let provinceInput = "Hà Giang";
  let totalDays = 3;
  let selectedInterests = ["Cảnh quan", "Ẩm thực"];
  
  // Loading states
  let isLoadingSpots = false;
  let isLoadingItinerary = false;
  let isLoadingEateries = false;
  let isLoadingHotels = false;

  // Search Results
  let spots = [];
  let eateries = [];
  let hotels = [];
  let itineraryMarkdown = "";
  let selectedSpot = null;

  // Load provinces on mount
  onMount(async () => {
    try {
      const list = await getProvinces();
      if (list && list.length > 0) {
        provinces = list;
      }
    } catch (e) {
      console.error(e);
    }
  });

  // Watch province selection to load categories
  $: if ($selectedProvince) {
    loadCategories($selectedProvince);
  }

  async function loadCategories(prov) {
    try {
      const tree = await getCategoryTree(prov);
      availableCategories = tree || {};
      selectedSubcategories = [];
    } catch (e) {
      console.error(e);
    }
  }

  // Handle Tab 1: AI Itinerary Generation
  async function handleGenerateItinerary() {
    if (!provinceInput) return;
    isLoadingItinerary = true;
    selectedProvince.set(provinceInput);
    itineraryMarkdown = "";

    try {
      const res = await generateItinerary({
        province: provinceInput,
        days: totalDays,
        preferences: {
          interests: selectedInterests,
          pace: "Vừa phải",
          group_type: "Gia đình"
        }
      });
      itineraryMarkdown = res.itinerary || "Không thể tạo lịch trình. Vui lòng kiểm tra lại cấu hình API.";
      
      // Load spots for this province to pin them on the map
      const placesList = await getPlacesByProvinceAndCategory(provinceInput, []);
      touristPlaces.set(placesList);
    } catch (e) {
      console.error(e);
      itineraryMarkdown = "Đã xảy ra lỗi trong quá trình tạo lịch trình. Đảm bảo rằng khóa GEMINI_API_KEY trong file .env đã được điền chính xác.";
    } finally {
      isLoadingItinerary = false;
    }
  }

  // Handle Tab 2: Nearby Eateries/Cafe Search via Geolocation
  async function handleSearchEateries(type) {
    if (!$userLocation) {
      alert("Vui lòng click 'Định vị GPS của tôi' ở thanh công cụ phía trên trước.");
      return;
    }
    isLoadingEateries = true;
    nearbyEateries.set([]);
    eateries = [];

    try {
      const results = await getNearbyEateries($userLocation.lat, $userLocation.lng, 2000);
      eateries = results.filter(e => type === 'all' || (type === 'cafe' && e.name.toLowerCase().includes('cafe')) || (type === 'restaurant' && !e.name.toLowerCase().includes('cafe')));
      nearbyEateries.set(eateries);
    } catch (e) {
      console.error(e);
    } finally {
      isLoadingEateries = false;
    }
  }

  // Handle Tab 3: Search Spots
  async function handleSearchSpots() {
    if (!provinceInput) return;
    isLoadingSpots = true;
    selectedSpot = null;
    selectedPlaceStore.set(null);
    touristPlaces.set([]);
    nearbyHotels.set([]);
    hotels = [];

    try {
      selectedProvince.set(provinceInput);
      const list = await getPlacesByProvinceAndCategory(provinceInput, selectedSubcategories);
      spots = list;
      touristPlaces.set(spots);
    } catch (e) {
      console.error(e);
    } finally {
      isLoadingSpots = false;
    }
  }

  // Search hotels near selected spot
  async function handleFindHotels(spot) {
    selectedSpot = spot;
    selectedPlaceStore.set(spot);
    isLoadingHotels = true;
    hotels = [];
    nearbyHotels.set([]);

    try {
      const res = await getHotelsNearPlace(spot, 2);
      hotels = res || [];
      nearbyHotels.set(hotels);
    } catch (e) {
      console.error(e);
    } finally {
      isLoadingHotels = false;
    }
  }

  // Toggle subcategories filters
  function toggleSubcategory(subcat) {
    if (selectedSubcategories.includes(subcat)) {
      selectedSubcategories = selectedSubcategories.filter(s => s !== subcat);
    } else {
      selectedSubcategories = [...selectedSubcategories, subcat];
    }
  }

  // Toggle interests filters
  function toggleInterest(interest) {
    if (selectedInterests.includes(interest)) {
      selectedInterests = selectedInterests.filter(i => i !== interest);
    } else {
      selectedInterests = [...selectedInterests, interest];
    }
  }
</script>

<div class="sidebar-wrapper">
  {#if activeTab === "itinerary"}
    <!-- TAB 1: AI PLANNER -->
    <div class="tab-content">
      <div class="input-group">
        <label for="province">Tỉnh/Thành phố muốn đi</label>
        <div class="select-wrapper">
          <select id="province" bind:value={provinceInput}>
            {#each provinces as prov}
              <option value={prov}>{prov}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="input-group">
        <label for="days">Số ngày đi: {totalDays} ngày</label>
        <input type="range" id="days" min="1" max="10" bind:value={totalDays} />
      </div>

      <div class="input-group">
        <label>Sở thích của bạn</label>
        <div class="chips-container">
          {#each ["Cảnh quan", "Ẩm thực", "Khu nghỉ dưỡng", "Chợ đêm", "Di tích"] as interest}
            <button 
              class="chip {selectedInterests.includes(interest) ? 'active' : ''}" 
              on:click={() => toggleInterest(interest)}
            >
              {interest}
            </button>
          {/each}
        </div>
      </div>

      <button class="btn-primary w-full" on:click={handleGenerateItinerary} disabled={isLoadingItinerary}>
        {#if isLoadingItinerary}
          <span class="spinner"></span> Đang lập kế hoạch...
        {:else}
          🤖 Lập lịch trình bằng AI
        {/if}
      </button>

      {#if itineraryMarkdown}
        <div class="itinerary-results-container">
          <h3 class="text-gradient">Lịch trình đề xuất:</h3>
          <div class="markdown-body">
            {#each itineraryMarkdown.split("\n") as line}
              {#if line.startsWith("###")}
                <h4>{line.replace("###", "").trim()}</h4>
              {:else if line.startsWith("*") || line.startsWith("-")}
                <p class="bullet-line">{line.substring(1).trim()}</p>
              {:else if line.trim() !== ""}
                <p>{line}</p>
              {/if}
            {/each}
          </div>
        </div>
      {/if}
    </div>

  {:else if activeTab === "foods"}
    <!-- TAB 2: NEARBY FOOD FINDER -->
    <div class="tab-content">
      {#if !$userLocation}
        <div class="no-gps-message">
          <div class="gps-icon">📍</div>
          <p>Chưa xác định được vị trí GPS của bạn.</p>
          <p class="sub-text">Hãy bấm nút <strong>Định vị GPS của tôi</strong> trên thanh menu ở đầu trang để tìm quán ngon xung quanh.</p>
        </div>
      {:else}
        <div class="gps-info glass">
          <span class="gps-dot"></span>
          <span>Tọa độ của bạn: {$userLocation.lat.toFixed(5)}, {$userLocation.lng.toFixed(5)}</span>
        </div>

        <div class="food-search-actions">
          <button class="btn-secondary" on:click={() => handleSearchEateries("restaurant")} disabled={isLoadingEateries}>
            🍕 Tìm Quán Ăn Ngon
          </button>
          <button class="btn-secondary" on:click={() => handleSearchEateries("cafe")} disabled={isLoadingEateries}>
            ☕ Tìm Quán Cafe Đẹp
          </button>
        </div>

        {#if isLoadingEateries}
          <div class="loading-container">
            <span class="spinner"></span> Đang quét Google Places...
          </div>
        {:else if eateries.length > 0}
          <div class="results-list">
            <h3 class="text-gradient">Quán ngon gần bạn (2km):</h3>
            {#each eateries as eat, idx}
              <div class="card glass shadow-sm">
                <div class="card-header">
                  <h4>{idx + 1}. {eat.name}</h4>
                  {#if eat.rating}
                    <span class="badge badge-warning">⭐ {eat.rating}</span>
                  {/if}
                </div>
                <p class="card-address">📍 {eat.address}</p>
                <div class="card-actions">
                  <a href={eat.google_maps_link} target="_blank" class="card-link">Xem bản đồ ↗</a>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-state">
            <p>Bấm một nút ở trên để bắt đầu quét địa điểm ăn uống thực tế.</p>
          </div>
        {/if}
      {/if}
    </div>

  {:else if activeTab === "search"}
    <!-- TAB 3: SPOT DISCOVERY -->
    <div class="tab-content">
      <div class="input-group">
        <label for="search-province">Chọn khu vực/Tỉnh</label>
        <div class="select-wrapper">
          <select id="search-province" bind:value={provinceInput}>
            {#each provinces as prov}
              <option value={prov}>{prov}</option>
            {/each}
          </select>
        </div>
      </div>

      {#if availableCategories && Object.keys(availableCategories).length > 0}
        <div class="input-group">
          <label>Lọc theo thể loại</label>
          <div class="chips-container">
            {#each Object.keys(availableCategories) as cat}
              {#each availableCategories[cat] as subcat}
                <button 
                  class="chip {selectedSubcategories.includes(subcat) ? 'active' : ''}" 
                  on:click={() => toggleSubcategory(subcat)}
                >
                  {subcat}
                </button>
              {/each}
            {/each}
          </div>
        </div>
      {/if}

      <button class="btn-primary w-full" on:click={handleSearchSpots} disabled={isLoadingSpots}>
        {#if isLoadingSpots}
          <span class="spinner"></span> Đang tìm kiếm...
        {:else}
          🔍 Khám Phá Địa Điểm
        {/if}
      </button>

      {#if spots.length > 0}
        <div class="results-list">
          <h3 class="text-gradient">Danh lam thắng cảnh tìm thấy:</h3>
          {#each spots as spot}
            <div class="card glass shadow-sm {selectedSpot?.id === spot.id ? 'active-card' : ''}">
              <div class="card-header">
                <h4>{spot.name}</h4>
                {#if spot.rating}
                  <span class="badge badge-success">⭐ {spot.rating}</span>
                {/if}
              </div>
              <p class="card-address">📍 {spot.address}</p>
              <p class="card-description">{spot.description}</p>
              <div class="card-buttons">
                <button class="btn-small" on:click={() => handleFindHotels(spot)}>
                  🏨 Khách sạn gần đây
                </button>
                <a href={spot.google_maps_link} target="_blank" class="card-link">Chỉ đường ↗</a>
              </div>

              <!-- Hotels list sub-panel inside selected spot -->
              {#if selectedSpot?.id === spot.id}
                <div class="hotels-subpanel">
                  <h5>Khách sạn gần {spot.name}:</h5>
                  {#if isLoadingHotels}
                    <div class="loading-small">
                      <span class="spinner spinner-sm"></span> Đang quét Google Lodgings...
                    </div>
                  {:else if hotels.length > 0}
                    <div class="hotel-items">
                      {#each hotels as hotel, hIdx}
                        <div class="hotel-item border-b">
                          <p class="hotel-name"><strong>{hIdx+1}. {hotel.hotel}</strong></p>
                          <p class="hotel-address-text">{hotel.address}</p>
                          {#if hotel.description}
                            <p class="hotel-desc">{hotel.description}</p>
                          {/if}
                          {#if hotel.link}
                            <a href={hotel.link} target="_blank" class="hotel-link">Xem khách sạn ↗</a>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {:else}
                    <p class="no-hotels">Không tìm thấy khách sạn nào lân cận.</p>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .sidebar-wrapper {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .tab-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  label {
    font-size: 13px;
    font-weight: 600;
    color: #94a3b8;
  }

  .select-wrapper {
    position: relative;
    width: 100%;
  }

  select {
    width: 100%;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 10px 14px;
    color: white;
    font-size: 14px;
    font-weight: 500;
    outline: none;
    cursor: pointer;
    appearance: none;
  }

  input[type="range"] {
    width: 100%;
    accent-color: #3b82f6;
  }

  .chips-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .chip {
    background: #1e293b;
    border: 1px solid #334155;
    color: #94a3b8;
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .chip:hover {
    background: #334155;
    color: white;
  }

  .chip.active {
    background: rgba(59, 130, 246, 0.15);
    border-color: #3b82f6;
    color: #60a5fa;
  }

  .w-full {
    width: 100%;
  }

  /* Spinner */
  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s ease-in-out infinite;
    margin-right: 8px;
  }

  .spinner-sm {
    width: 12px;
    height: 12px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Timeline results styling */
  .itinerary-results-container {
    margin-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    padding-top: 20px;
  }

  .markdown-body {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 16px;
    border-radius: 8px;
    font-size: 13.5px;
    line-height: 1.6;
    color: #cbd5e1;
    max-height: 500px;
    overflow-y: auto;
  }

  .markdown-body h4 {
    color: #60a5fa;
    font-size: 15px;
    margin-top: 18px;
    margin-bottom: 8px;
    border-left: 3px solid #3b82f6;
    padding-left: 8px;
  }

  .markdown-body p {
    margin: 6px 0;
  }

  .bullet-line {
    padding-left: 12px;
    position: relative;
  }

  .bullet-line::before {
    content: "•";
    position: absolute;
    left: 0;
    color: #8b5cf6;
  }

  /* GPS Info panel */
  .gps-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 12px;
    color: #94a3b8;
    border-color: rgba(59, 130, 246, 0.1);
  }

  .gps-dot {
    width: 8px;
    height: 8px;
    background: #10b981;
    border-radius: 50%;
    animation: flash 1.5s infinite;
  }

  @keyframes flash {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }

  .no-gps-message {
    text-align: center;
    padding: 40px 20px;
    color: #94a3b8;
  }

  .gps-icon {
    font-size: 40px;
    margin-bottom: 12px;
    animation: bounce 2s infinite;
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  .sub-text {
    font-size: 12px;
    margin-top: 8px;
  }

  .food-search-actions {
    display: flex;
    gap: 10px;
  }

  .food-search-actions button {
    flex: 1;
    font-size: 13px;
    padding: 10px;
    border-radius: 8px;
  }

  /* Results listings */
  .results-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 10px;
  }

  .results-list h3 {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .card {
    padding: 14px;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: rgba(30, 41, 59, 0.4);
    border-color: rgba(255, 255, 255, 0.04);
    transition: all 0.2s ease;
  }

  .card:hover {
    background: rgba(30, 41, 59, 0.6);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .active-card {
    border-color: rgba(59, 130, 246, 0.5) !important;
    background: rgba(59, 130, 246, 0.05) !important;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .card-header h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #f1f5f9;
  }

  .badge {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .badge-warning {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
  }

  .badge-success {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
  }

  .card-address {
    margin: 0;
    font-size: 12px;
    color: #94a3b8;
  }

  .card-description {
    margin: 0;
    font-size: 12px;
    color: #cbd5e1;
    line-height: 1.5;
  }

  .card-buttons {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 4px;
  }

  .btn-small {
    background: #1e293b;
    border: 1px solid #334155;
    color: #60a5fa;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-small:hover {
    background: #334155;
    color: white;
  }

  .card-link {
    font-size: 11.5px;
    font-weight: 600;
    color: #8b5cf6;
    text-decoration: none;
  }

  .card-link:hover {
    color: #a78bfa;
    text-decoration: underline;
  }

  /* Hotels inside card details */
  .hotels-subpanel {
    margin-top: 10px;
    background: rgba(15, 23, 42, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 12px;
  }

  .hotels-subpanel h5 {
    margin: 0 0 10px 0;
    font-size: 12px;
    color: #60a5fa;
    font-weight: 600;
  }

  .loading-small {
    font-size: 11px;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .hotel-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .hotel-item {
    font-size: 11.5px;
    color: #cbd5e1;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  .hotel-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .hotel-name {
    margin: 0;
    color: white;
  }

  .hotel-address-text {
    margin: 2px 0;
    font-size: 10.5px;
    color: #94a3b8;
  }

  .hotel-desc {
    margin: 2px 0;
    font-size: 10.5px;
    color: #94a3b8;
    font-style: italic;
  }

  .hotel-link {
    font-size: 10.5px;
    color: #60a5fa;
    font-weight: 600;
    text-decoration: none;
  }

  .hotel-link:hover {
    color: #93c5fd;
    text-decoration: underline;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #64748b;
    font-size: 13px;
  }
</style>
