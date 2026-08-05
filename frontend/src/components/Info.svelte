<!--
frontend/my-vietnam-map/src/components/Info.svelte
-->
<script>
  import { 
    selectedProvince, 
    touristPlaces, 
    selectedPlace as selectedPlaceStore, 
    nearbyHotels, 
    nearbyEateries, 
    userLocation 
  } from "../stores.js";
  import { onMount } from "svelte";
  import {
    getPlacesByProvince,
    getCategoryTree,
    getPlacesByProvinceAndCategory,
  } from "../api/tourism.js";
  import { getHotelsNearPlace } from "../api/hotel.js";
  import { getFoodsByProvinceAndTag, getMainFoodTags, getNearbyEateries } from "../api/food.js";
  import {
    generateItinerary,
    formatItineraryData,
    calculateDates,
    formatDate,
  } from "../api/itinerary.js";

  $: province = $selectedProvince;
  $: filteredPlaces = [];
  $: touristPlaces.set(filteredPlaces);
  $: selectedPlaceStore.set(selectedPlace);
  $: nearbyHotels.set(hotels);

  let selectedCategories = ["all"];
  let allPlaces = [];
  let selectedPlace = null;
  let minRating = 0;
  let isLoading = false;
  let isLoadingHotels = false;
  let hotels = [];
  let showHotels = false;
  let selectedFoodTag = "";
  let foodSuggestions = [];
  let isLoadingFoods = false;
  let showFoodResults = false;
  let mainFoodTags = [];
  let isLoadingMainTags = false;
  let isCreatingItinerary = false;
  let showDatePopup = false;
  let showItineraryTable = false;
  let isLoadingItinerary = false;
  let itineraryData = null;
  let selectedPlaces = [];
  let availableCategories = {};
  let selectedSubcategories = [];
  let selectedStartDate = new Date().toISOString().split("T")[0];
  let selectedEndDate = new Date(new Date().setDate(new Date().getDate() + 2))
    .toISOString()
    .split("T")[0];

  function calculateTotalDays() {
    if (!selectedStartDate || !selectedEndDate) return 0;
    const startDateObj = new Date(selectedStartDate);
    const endDateObj = new Date(selectedEndDate);
    const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  }
  $: totalDays = calculateTotalDays();

  async function loadCategories() {
    if (!province) return;
    try {
      const categories = await getCategoryTree(province);
      availableCategories = categories || {};
      console.log(
        `[CATEGORIES] Loaded categories for ${province}:`,
        availableCategories,
      );
    } catch (error) {
      console.error("Error loading categories:", error);
      availableCategories = {};
    }
  }

  async function loadPlacesData() {
    if (!province) return;

    isLoading = true;
    console.log(`[LOAD] Loading places for: ${province}`);

    try {
      allPlaces = await getPlacesByProvince(province);
      console.log(`[LOAD] Received ${allPlaces.length} places`);

      if (allPlaces.length > 0) {
        console.log("[LOAD] First place sample:", {
          name: allPlaces[0].name,
          category: allPlaces[0].category,
          type: allPlaces[0].type,
          rating: allPlaces[0].rating,
          tags: allPlaces[0].tags,
        });
      }

      filteredPlaces = [...allPlaces].sort(
        (a, b) => (b.rating || 0) - (a.rating || 0),
      );
      console.log(
        `[LOAD] Set filteredPlaces to ${filteredPlaces.length} items`,
      );
    } catch (err) {
      console.error("Lỗi tải dữ liệu:", err);
      allPlaces = [];
      filteredPlaces = [];
    }
    isLoading = false;
  }

  async function loadMainFoodTags() {
    if (!province) return;

    isLoadingMainTags = true;
    try {
      mainFoodTags = await getMainFoodTags(province);
      console.log(
        `[FOOD] Loaded ${mainFoodTags.length} main tags for ${province}:`,
        mainFoodTags,
      );
    } catch (error) {
      console.error("Lỗi khi tải danh sách tag ẩm thực:", error);
      mainFoodTags = [];
    } finally {
      isLoadingMainTags = false;
    }
  }

  function filterPlaces() {
    console.log("[FILTER] Starting filter...");
    console.log("[FILTER] allPlaces:", allPlaces.length);
    console.log("[FILTER] selectedSubcategories:", selectedSubcategories);
    console.log("[FILTER] minRating:", minRating);

    if (!province || allPlaces.length === 0) {
      filteredPlaces = [];
      return;
    }

    let filtered = allPlaces;

    if (selectedSubcategories.length > 0) {
      filtered = filtered.filter((place) => {
        const placeSubcats = place.sub_category || [];

        if (Array.isArray(placeSubcats)) {
          return selectedSubcategories.some((selected) =>
            placeSubcats.includes(selected),
          );
        } else if (typeof placeSubcats === "string") {
          return selectedSubcategories.includes(placeSubcats);
        }
        return false;
      });
    }

    if (minRating > 0) {
      filtered = filtered.filter((p) => (p.rating || 0) >= minRating);
    }

    filtered = filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    filteredPlaces = filtered;

    console.log(`[FILTER] Filtered to ${filteredPlaces.length} places`);
  }

  function handleSearch() {
    filterPlaces();
  }

  function resetFilters() {
    selectedSubcategories = [];
    minRating = 0;
    filteredPlaces = [...allPlaces].sort(
      (a, b) => (b.rating || 0) - (a.rating || 0),
    );
  }

  function handlePlaceClick(place) {
    selectedPlace = place;
    showHotels = false;
    hotels = [];
  }

  function handleBackToList() {
    selectedPlace = null;
    showHotels = false;
    hotels = [];
  }

  async function handleFindHotels() {
    if (!selectedPlace) {
      alert("Vui lòng chọn địa điểm");
      return;
    }

    isLoadingHotels = true;
    showHotels = true;

    try {
      const hotelData = await getHotelsNearPlace(selectedPlace.id, 50);
      hotels = hotelData;
    } catch (error) {
      alert("Có lỗi xảy ra khi tìm khách sạn: " + error.message);
    } finally {
      isLoadingHotels = false;
    }
  }

  function handleCloseHotels() {
    showHotels = false;
    hotels = [];
    nearbyHotels.set([]);
  }

  let eateries = [];
  let showEateries = false;
  let isLoadingEateries = false;
  let isLocatingUser = false;

  async function handleFindEateriesNearPlace() {
    if (!selectedPlace || !selectedPlace.latitude || !selectedPlace.longitude) {
      alert("Địa điểm này không có tọa độ để tìm kiếm");
      return;
    }
    isLoadingEateries = true;
    showEateries = true;
    try {
      const data = await getNearbyEateries(selectedPlace.latitude, selectedPlace.longitude, 2000);
      eateries = data;
      nearbyEateries.set(eateries);
    } catch (e) {
      alert("Lỗi khi tìm quán ăn: " + e.message);
      eateries = [];
    } finally {
      isLoadingEateries = false;
    }
  }

  function handleCloseEateries() {
    showEateries = false;
    eateries = [];
    nearbyEateries.set([]);
  }

  function handleLocateAndFindEateries() {
    if (!navigator.geolocation) {
      alert("Trình duyệt của bạn không hỗ trợ định vị GPS");
      return;
    }
    isLocatingUser = true;
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        userLocation.set({ lat: latitude, lng: longitude });

        isLoadingFoods = true;
        showFoodResults = true;
        selectedFoodTag = "Gần tôi";
        foodSuggestions = [];

        try {
          const data = await getNearbyEateries(latitude, longitude, 2000);
          foodSuggestions = data.map(item => ({
            id: item.id,
            food: item.name,
            description: `${item.address} (Đánh giá: ⭐${item.rating || 0})`,
            image_url: item.image_url || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR8JNlq0XlmA3xA-DysUJbWAEw1pHIeVYhdvA&s"
          }));
          nearbyEateries.set(data);
        } catch (e) {
          alert("Lỗi khi quét quán ăn xung quanh: " + e.message);
        } finally {
          isLoadingFoods = false;
          isLocatingUser = false;
        }
      },
      (error) => {
        alert("Không thể định vị GPS: " + error.message);
        isLocatingUser = false;
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleFindFoods(tag) {
    if (!province || !tag) {
      alert("Vui lòng chọn loại ẩm thực");
      return;
    }
    selectedFoodTag = tag;
    isLoadingFoods = true;
    showFoodResults = true;
    try {
      const foods = await getFoodsByProvinceAndTag(province, tag);
      foodSuggestions = foods;
    } catch (error) {
      alert("Có lỗi xảy ra khi tìm món ăn: " + error.message);
      foodSuggestions = [];
    } finally {
      isLoadingFoods = false;
    }
  }

  function handleCloseFoods() {
    showFoodResults = false;
    foodSuggestions = [];
    selectedFoodTag = "";
  }

  function handleCreateItinerary() {
    isCreatingItinerary = true;
    selectedPlaces = [];
  }

  function handleTogglePlaceSelection(place) {
    if (!isCreatingItinerary) return;

    const index = selectedPlaces.findIndex((p) => p.id === place.id);
    if (index === -1) {
      selectedPlaces.push(place);
    } else {
      selectedPlaces.splice(index, 1);
    }
    selectedPlaces = [...selectedPlaces];
  }

  function handleCompleteSelection() {
    if (selectedPlaces.length === 0) {
      alert("Bạn hãy chọn ít nhất một địa điểm để tạo lịch trình");
      return;
    }
    showDatePopup = true;
  }

  function handleCancelItinerary() {
    isCreatingItinerary = false;
    showDatePopup = false;
    showItineraryTable = false;
    itineraryData = null;
    selectedPlaces = [];
  }

  async function handleCreateFinalItinerary() {
    if (!selectedStartDate || !selectedEndDate) {
      alert("Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc");
      return;
    }

    const days = calculateTotalDays();
    if (days <= 0) {
      alert("Ngày kết thúc phải sau ngày bắt đầu");
      return;
    }

    isLoadingItinerary = true;
    showDatePopup = false;

    try {
      const itineraryRequest = {
        province: province,
        days: days,
        preferences: {
          interests: [
            ...new Set(
              selectedPlaces
                .map((p) => p.category || p.type || "")
                .filter(Boolean),
            ),
          ],
          pace: "medium",
          group_type: "family",
          avoid_categories: [],
          time_preferences: {},
        },
      };

      console.log("Gửi request tạo lịch trình:", itineraryRequest);

      const apiResponse = await generateItinerary(itineraryRequest);
      console.log("Response từ API:", apiResponse);

      itineraryData = formatSimpleItinerary(apiResponse, days);

      if (itineraryData) {
        const dates = calculateDates(new Date(selectedStartDate), days);
        itineraryData.days.forEach((day, index) => {
          if (dates[index]) {
            day.date = dates[index];
          }
        });
        showItineraryTable = true;
        isCreatingItinerary = false;
        selectedPlaces = [];
      } else {
        alert("Không thể tạo lịch trình. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Lỗi khi tạo lịch trình:", error);
      alert("Có lỗi xảy ra khi tạo lịch trình: " + error.message);
    } finally {
      isLoadingItinerary = false;
    }
  }

  function formatSimpleItinerary(apiResponse, totalDays) {
    console.log("Formatting simple itinerary:", apiResponse);

    const itinerary = {
      summary: {
        province: apiResponse.province || province,
        totalDays: apiResponse.days || totalDays,
        totalPlaces: apiResponse.rag_contexts_used?.length || 0,
        rawResponse: apiResponse,
      },
      days: [],
      rawData: apiResponse,
    };

    if (
      apiResponse.rag_contexts_used &&
      apiResponse.rag_contexts_used.length > 0
    ) {
      const placesPerDay = Math.ceil(
        apiResponse.rag_contexts_used.length / totalDays,
      );

      for (let day = 1; day <= totalDays; day++) {
        const startIndex = (day - 1) * placesPerDay;
        const endIndex = Math.min(
          startIndex + placesPerDay,
          apiResponse.rag_contexts_used.length,
        );
        const dayPlaces = apiResponse.rag_contexts_used.slice(
          startIndex,
          endIndex,
        );

        const formattedPlaces = dayPlaces.map((ctx) => ({
          name: ctx.raw.name,
          detail: ctx.raw,
          time: ctx.raw.duration_recommend || "",
          description:
            ctx.raw.description ||
            (ctx.raw.highlights && ctx.raw.highlights.length > 0
              ? ctx.raw.highlights[0]
              : ""),
          category: ctx.raw.category || "",
          rating: ctx.raw.rating || 0,
          location: ctx.raw.address || "",
          coordinates:
            ctx.raw.latitude && ctx.raw.longitude
              ? { lat: ctx.raw.latitude, lng: ctx.raw.longitude }
              : null,
        }));

        itinerary.days.push({
          dayNumber: day,
          date: null,
          places: formattedPlaces,
          notes: extractNotesFromItinerary(apiResponse.itinerary, day),
        });
      }
    } else {
      for (let day = 1; day <= totalDays; day++) {
        itinerary.days.push({
          dayNumber: day,
          date: null,
          places: [],
          notes: [],
        });
      }
    }

    return itinerary;
  }

  function extractNotesFromItinerary(itineraryText, dayNumber) {
    if (!itineraryText) return [];

    const notes = [];
    const dayPattern = new RegExp(
      `(Ngày\\s*${dayNumber}:|Day\\s*${dayNumber}.*?\\n)`,
      "i",
    );
    const match = itineraryText.match(dayPattern);

    if (match) {
      const startIndex = match.index + match[0].length;
      const nextDayPattern = new RegExp(
        `(Ngày\\s*${dayNumber + 1}:|Day\\s*${dayNumber + 1}.*?\\n)`,
        "i",
      );
      const nextMatch = itineraryText.slice(startIndex).match(nextDayPattern);

      let dayText;
      if (nextMatch) {
        dayText = itineraryText.slice(startIndex, startIndex + nextMatch.index);
      } else {
        dayText = itineraryText.slice(startIndex);
      }

      const lines = dayText.split("\n");
      lines.forEach((line) => {
        if (
          line.includes("Ghi chú:") ||
          line.includes("Gợi ý:") ||
          line.includes("Lưu ý:") ||
          line.includes("Note:")
        ) {
          const note = line.replace(/Ghi chú:|Gợi ý:|Lưu ý:|Note:/i, "").trim();
          if (note) notes.push(note);
        }
      });
    }

    return notes;
  }

  function getPlaceDescription(place) {
    if (place.detail?.description) {
      return place.detail.description;
    }
    if (place.detail?.highlights && place.detail.highlights.length > 0) {
      return place.detail.highlights[0];
    }
    if (place.description) {
      return place.description;
    }
    return place.name;
  }

  function formatDisplayDate(date) {
    if (!date) return "";
    return formatDate(date);
  }

  $: if (province) {
    loadPlacesData();
    loadCategories();
    loadMainFoodTags();
    selectedPlace = null;
    showHotels = false;
    hotels = [];
    showFoodResults = false;
    foodSuggestions = [];
    selectedFoodTag = "";
    handleCancelItinerary();
    selectedStartDate = new Date().toISOString().split("T")[0];
    selectedEndDate = new Date(new Date().setDate(new Date().getDate() + 2))
      .toISOString()
      .split("T")[0];
  }
</script>

{#if province}
  <div class="info-container">
    {#if isLoading}
      <div class="loading">
        <div class="spinner"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    {:else if !selectedPlace}
      <div class="province-header">
        <h2>{province}</h2>
        <div class="header-buttons">
          <button on:click={resetFilters} class="reset-btn">Reset</button>
          {#if !isCreatingItinerary && !showItineraryTable}
            <button on:click={handleLocateAndFindEateries} class="gps-btn" style="background: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px; margin-right: 5px;">
              {isLocatingUser ? "Đang định vị..." : "📍 Tìm quán quanh tôi"}
            </button>
            <button on:click={handleCreateItinerary} class="itinerary-btn"
              >Thử tạo lịch trình</button
            >
          {:else if isCreatingItinerary}
            <button on:click={handleCompleteSelection} class="complete-btn"
              >Hoàn tất</button
            >
            <button on:click={handleCancelItinerary} class="cancel-btn"
              >Hủy</button
            >
          {/if}
        </div>
      </div>

      {#if showDatePopup}
        <div class="date-popup-overlay">
          <div class="date-popup">
            <div class="date-popup-header">
              <h3>Thiết lập lịch trình</h3>
              <button
                on:click={() => (showDatePopup = false)}
                class="close-popup-btn">×</button
              >
            </div>

            <div class="date-popup-content">
              <div class="date-selection">
                <div class="date-group">
                  <h4>Ngày bắt đầu</h4>
                  <div class="date-inputs">
                    <input
                      type="date"
                      bind:value={selectedStartDate}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                </div>

                <div class="date-group">
                  <h4>Ngày kết thúc</h4>
                  <div class="date-inputs">
                    <input
                      type="date"
                      bind:value={selectedEndDate}
                      min={selectedStartDate}
                    />
                  </div>
                </div>
              </div>

              <div class="selected-places-summary">
                <h4>Đã chọn {selectedPlaces.length} địa điểm</h4>
                <div class="selected-places-list">
                  {#each selectedPlaces as place}
                    <span class="selected-place-tag">{place.name}</span>
                  {/each}
                </div>
              </div>
            </div>

            <div class="date-popup-actions">
              <button
                on:click={handleCreateFinalItinerary}
                class="create-itinerary-btn"
                disabled={isLoadingItinerary ||
                  !selectedStartDate ||
                  !selectedEndDate}
              >
                {isLoadingItinerary ? "Đang tạo..." : "Tạo lịch trình"}
              </button>
              <button
                on:click={() => (showDatePopup = false)}
                class="cancel-date-btn"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      {/if}

      {#if showItineraryTable && itineraryData}
        <div class="itinerary-table-container">
          <div class="itinerary-header">
            <h2>Lịch trình {itineraryData.summary.province}</h2>
            <button
              on:click={() => (showItineraryTable = false)}
              class="close-itinerary-btn">×</button
            >
          </div>

          <div class="itinerary-summary">
            <p>
              Thời gian: {formatDisplayDate(selectedStartDate)} - {formatDisplayDate(
                selectedEndDate,
              )}
              ({itineraryData.summary.totalDays} ngày)
            </p>
            <p>Tổng số địa điểm: {itineraryData.summary.totalPlaces}</p>
          </div>

          <div class="itinerary-days">
            {#each itineraryData.days as day}
              <div class="itinerary-day">
                <div class="day-header">
                  <h3>Ngày {day.dayNumber}: {formatDisplayDate(day.date)}</h3>
                  <span class="day-places-count"
                    >{day.places.length} địa điểm</span
                  >
                </div>

                <div class="day-places">
                  {#each day.places as place, placeIndex}
                    <div class="itinerary-place">
                      <div class="place-number">{placeIndex + 1}</div>
                      <div class="place-content">
                        <h4>{place.name}</h4>
                        <div class="place-meta">
                          {#if place.detail?.category}
                            <span class="category-badge"
                              >{place.detail.category}</span
                            >
                          {:else if place.category}
                            <span class="category-badge">{place.category}</span>
                          {/if}
                          {#if place.detail?.rating || place.rating}
                            <span class="rating"
                              >⭐ {(
                                place.detail?.rating ||
                                place.rating ||
                                0
                              ).toFixed(1)}</span
                            >
                          {/if}
                        </div>

                        {#if place.time}
                          <p class="place-time">⏰ {place.time}</p>
                        {/if}

                        <p class="place-description">
                          {getPlaceDescription(place)}
                        </p>

                        {#if place.detail?.address}
                          <p class="place-address">📍 {place.detail.address}</p>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>

                {#if day.notes && day.notes.length > 0}
                  <div class="day-notes">
                    <strong>📝 Ghi chú:</strong>
                    {#each day.notes as note}
                      <p>{note}</p>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
          </div>

          <div class="itinerary-actions">
            <button
              class="new-itinerary-btn"
              on:click={() => {
                showItineraryTable = false;
                handleCreateItinerary();
              }}
            >
              Tạo lịch trình mới
            </button>
            <button
              class="cancel-itinerary-btn"
              on:click={() => (showItineraryTable = false)}
            >
              Đóng
            </button>
          </div>
        </div>
      {:else if showItineraryTable && isLoadingItinerary}
        <div class="loading-itinerary">
          <div class="spinner"></div>
          <p>Đang tạo lịch trình...</p>
        </div>
      {/if}

      <div class="filter-section">
        <h3>Bạn muốn tìm địa điểm thế nào</h3>

        {#if Object.keys(availableCategories).length > 0}
          <div class="categories-container">
            {#each Object.entries(availableCategories) as [category, subcategories]}
              <div class="category-group">
                <h4>{category}</h4>
                <div class="subcategory-buttons">
                  {#each subcategories as sub}
                    <label class="subcategory-checkbox">
                      <input
                        type="checkbox"
                        bind:group={selectedSubcategories}
                        value={sub}
                        checked={selectedSubcategories.includes(sub)}
                      />
                      <span>{sub}</span>
                    </label>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        {/if}

        <div class="rating-filter">
          <label>Mức đánh giá bạn muốn: {minRating.toFixed(1)} ⭐</label>
          <input
            type="range"
            min="0"
            max="5"
            step="0.5"
            bind:value={minRating}
          />
        </div>

        <div class="search-actions">
          <button class="search-btn" on:click={handleSearch}>Tìm kiếm</button>
        </div>
      </div>

      {#if isCreatingItinerary}
        <div class="itinerary-instruction">
          <p>Chọn các địa điểm bạn muốn thêm vào lịch trình:</p>
          <p class="selected-count">
            Đã chọn: {selectedPlaces.length} địa điểm
          </p>
        </div>
      {/if}

      <div class="places-list">
        <h3>Tìm thấy {filteredPlaces.length} địa điểm sau</h3>
        {#if filteredPlaces.length > 0}
          <div class="places-grid">
            {#each filteredPlaces as place}
              <div
                class="place-card {isCreatingItinerary ? 'selectable' : ''}"
                on:click={isCreatingItinerary
                  ? () => {}
                  : () => handlePlaceClick(place)}
              >
                {#if isCreatingItinerary}
                  <div class="itinerary-checkbox">
                    <input
                      type="checkbox"
                      on:click|stopPropagation={() =>
                        handleTogglePlaceSelection(place)}
                      checked={selectedPlaces.some((p) => p.id === place.id)}
                    />
                  </div>
                {/if}
                {#if place.image_url}
                  <img src={place.image_url} alt={place.name} />
                {:else}
                  <div class="no-image">📷</div>
                {/if}

                <div class="place-info">
                  <h4>{place.name}</h4>
                  <div class="place-meta">
                    <span class="category-badge"
                      >{place.category || "Không có"}</span
                    >
                    <span class="rating"
                      >⭐ {place.rating || 0} ({place.review_count || 0})</span
                    >
                  </div>
                  <p class="place-description">
                    {place.description
                      ? place.description.slice(0, 100) + "..."
                      : "Không có mô tả"}
                  </p>

                  <div class="place-tags">
                    {#each place.tags ? place.tags.slice(0, 3) : [] as tag}
                      <span class="tag">{tag}</span>
                    {/each}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {:else if allPlaces.length > 0}
          <p class="no-results">
            Không tìm thấy địa điểm phù hợp<br />
            <button
              on:click={resetFilters}
              style="margin-top: 10px; padding: 8px 16px;"
            >
              Hiển thị tất cả {allPlaces.length} địa điểm
            </button>
          </p>
        {:else}
          <p class="no-results">Không có dữ liệu địa điểm cho tỉnh này.</p>
        {/if}
      </div>

      <div class="food-discovery-section">
        <h3>Khám phá ẩm thực {province}</h3>
        <p class="food-subtitle">Chọn loại ẩm thực bạn muốn khám phá</p>

        {#if isLoadingMainTags}
          <div class="loading-tags">
            <div class="small-spinner"></div>
            <p>Đang tải danh sách ẩm thực...</p>
          </div>
        {:else if mainFoodTags.length > 0}
          <div class="food-tag-buttons">
            {#each mainFoodTags as tag}
              <button
                class="food-tag-btn"
                on:click={() => handleFindFoods(tag)}
                title={tag}
              >
                <span class="food-tag-text">
                  {tag === "món mặn"
                    ? "Món mặn"
                    : tag === "món chay"
                      ? "Món chay"
                      : tag}
                </span>
              </button>
            {/each}
          </div>
        {:else}
          <p class="no-food-tags">Không có dữ liệu ẩm thực cho tỉnh này</p>
        {/if}
      </div>

      {#if showFoodResults}
        <div class="food-results-section">
          <div class="food-results-header">
            <h3>Món {selectedFoodTag} tại {province}</h3>
            <button class="close-btn" on:click={handleCloseFoods}>×</button>
          </div>
          {#if isLoadingFoods}
            <div class="loading-foods">
              <div class="small-spinner"></div>
              <p>Đang tìm món ăn...</p>
            </div>
          {:else if foodSuggestions.length > 0}
            <div class="food-results-list">
              {#each foodSuggestions as food, index}
                <div class="food-result-card">
                  <div class="food-image-wrapper">
                    {#if food.image_url}
                      <img
                        src={food.image_url}
                        alt={food.food}
                        class="food-image"
                        loading="lazy"
                      />
                      <div class="food-image-fallback" style="display: none;">
                        {selectedFoodTag}
                      </div>
                    {:else}
                      <div class="food-image-fallback">
                        {selectedFoodTag}
                      </div>
                    {/if}
                    <div class="food-card-badge">#{index + 1}</div>
                  </div>
                  <div class="food-info">
                    <div class="food-header">
                      <span class="food-number">{index + 1}</span>
                      <h4 class="food-name">{food.food}</h4>
                    </div>
                    <p class="food-description">
                      {food.description || "Không có mô tả"}
                    </p>
                  </div>
                  <div class="food-meta">
                    <span class="food-id">ID: {food.id}</span>
                    <span class="food-tag-badge">{selectedFoodTag}</span>
                  </div>
                </div>
              {/each}
            </div>
            <div class="food-results-summary">
              <p>
                Tìm thấy <strong>{foodSuggestions.length}</strong> món {selectedFoodTag}
              </p>
            </div>
          {:else}
            <div class="no-food-results">
              <p>Không tìm thấy món {selectedFoodTag} nào tại {province}</p>
            </div>
          {/if}
        </div>
      {/if}
    {:else}
      <div class="place-detail">
        <button class="back-btn" on:click={handleBackToList}
          >← Quay lại danh sách</button
        >
        {#if selectedPlace.image_url}
          <img src={selectedPlace.image_url} class="detail-image" />
        {:else}
          <div class="no-image detail-no-image">📷</div>
        {/if}

        <h2>{selectedPlace.name}</h2>

        <div class="detail-meta">
          <span class="detail-category"
            >{selectedPlace.category || "Không có"}</span
          >
          <span class="detail-rating">
            ⭐ {selectedPlace.rating || 0} ({selectedPlace.review_count || 0} đánh
            giá)
          </span>
        </div>

        <div class="detail-section">
          <h4>Mô tả</h4>
          <p>{selectedPlace.description || "Không có mô tả"}</p>
        </div>

        <div class="detail-section">
          <h4>Địa chỉ</h4>
          <p>{selectedPlace.address || "Không có địa chỉ"}</p>
          <div style="display: flex; gap: 10px; margin-top: 10px;">
            <button class="hotel-btn" on:click={handleFindHotels} style="flex: 1;">
              {isLoadingHotels ? "Đang tìm..." : "🏨 Tìm khách sạn"}
            </button>
            <button class="eatery-btn" on:click={handleFindEateriesNearPlace} style="flex: 1; background: #dc3545; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: 600;">
              {isLoadingEateries ? "Đang tìm..." : "🍕 Tìm quán ăn"}
            </button>
          </div>
        </div>

        {#if showHotels}
          <div class="hotels-box">
            <div class="hotels-header">
              <h3>Khách sạn gần {selectedPlace.name}</h3>
              <button class="close-btn" on:click={handleCloseHotels}>×</button>
            </div>

            {#if isLoadingHotels}
              <div class="loading-hotels">
                <div class="small-spinner"></div>
                <p>Đang tìm khách sạn...</p>
              </div>
            {:else if hotels.length > 0}
              <div class="hotels-list">
                {#each hotels as hotel, index}
                  <div class="hotel-card">
                    <div class="hotel-header">
                      <h4>{index + 1}. {hotel.hotel}</h4>
                    </div>

                    <div class="hotel-info-grid">
                      <div class="info-item">
                        <span class="info-label">📍</span>
                        <span class="info-value"
                          >{hotel.address || "Không có địa chỉ"}</span
                        >
                      </div>

                      {#if hotel.description}
                        <div class="info-item">
                          <span class="info-value">{hotel.description}</span>
                        </div>
                      {/if}
                    </div>

                    {#if hotel.link}
                      <div class="hotel-actions">
                        <a
                          href={hotel.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="map-link-btn"
                        >
                          Xem khách sạn với Google Maps
                        </a>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>

              <div class="hotels-summary">
                <p>
                  Tìm thấy <strong>{hotels.length}</strong> khách sạn gần nhất
                </p>
              </div>
            {:else}
              <div class="no-hotels">
                <p>Không tìm thấy khách sạn nào trong bán kính 50km</p>
              </div>
            {/if}
          </div>
        {/if}

        {#if showEateries}
          <div class="hotels-box" style="border-color: #dc3545;">
            <div class="hotels-header" style="background: #dc3545; color: white;">
              <h3>Quán ăn gần {selectedPlace.name} (Google Places)</h3>
              <button class="close-btn" on:click={handleCloseEateries} style="color: white;">×</button>
            </div>

            {#if isLoadingEateries}
              <div class="loading-hotels">
                <div class="small-spinner"></div>
                <p>Đang tìm quán ăn...</p>
              </div>
            {:else if eateries.length > 0}
              <div class="hotels-list">
                {#each eateries as eatery, index}
                  <div class="hotel-card" style="border-left: 4px solid #dc3545;">
                    <div class="hotel-header">
                      <h4 style="color: #dc3545;">{index + 1}. {eatery.name}</h4>
                    </div>

                    <div class="hotel-info-grid">
                      <div class="info-item">
                        <span class="info-label">📍</span>
                        <span class="info-value">{eatery.address || "Không có địa chỉ"}</span>
                      </div>
                      <div class="info-item">
                        <span class="info-label">⭐</span>
                        <span class="info-value">{eatery.rating || 0} ({eatery.review_count || 0} đánh giá)</span>
                      </div>
                    </div>

                    {#if eatery.google_maps_link}
                      <div class="hotel-actions">
                        <a
                          href={eatery.google_maps_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="map-link-btn"
                          style="background: #dc3545; color: white; border-color: #dc3545;"
                        >
                          Xem trên Google Maps
                        </a>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>

              <div class="hotels-summary">
                <p>
                  Tìm thấy <strong>{eateries.length}</strong> quán ăn gần nhất (2km)
                </p>
              </div>
            {:else}
              <div class="no-hotels">
                <p>Không tìm thấy quán ăn nào trong bán kính 2km</p>
              </div>
            {/if}
          </div>
        {/if}

        <div class="detail-section">
          <h4>Giờ mở cửa</h4>
          <p>{selectedPlace.open_hours || "Không có thông tin"}</p>
        </div>

        {#if selectedPlace.highlights?.length > 0}
          <div class="detail-section">
            <h4>Điểm nổi bật</h4>
            <div class="highlight-list">
              {#each selectedPlace.highlights as h}
                <span class="highlight">{h}</span>
              {/each}
            </div>
          </div>
        {/if}

        {#if selectedPlace.food?.length > 0}
          <div class="detail-section">
            <h4>Ẩm thực địa phương</h4>
            <div class="food-list">
              {#each selectedPlace.food as item}
                <span class="food-item">{item}</span>
              {/each}
            </div>
          </div>
        {/if}

        {#if selectedPlace.tags?.length > 0}
          <div class="detail-section">
            <h4>Đặc điểm</h4>
            <div class="tags-list">
              {#each selectedPlace.tags as tag}
                <span class="tag">{tag}</span>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{:else}
  <div class="placeholder">
    <h3>Click vào một tỉnh trên bản đồ để xem thông tin</h3>
  </div>
{/if}

<style>
  :root {
    --map-lightest: #fdeeef;
    --map-medium: #f8d8dc;
    --map-darkest: #e48f97;
    --text-red: #a82223;
    --text-dark: #333333;
    --info-bg: #ffffff;
    --screen-bg: #faf2f2;
    --accent-green: #4caf50;
    --accent-blue: #2196f3;
    --shadow-light: rgba(168, 34, 35, 0.1);
    --shadow-medium: rgba(168, 34, 35, 0.15);
    --shadow-dark: rgba(168, 34, 35, 0.2);
    --border-light: rgba(228, 143, 151, 0.3);
    --border-medium: rgba(228, 143, 151, 0.5);
    --border-dark: rgba(228, 143, 151, 0.8);
  }

  body {
    background-color: var(--screen-bg);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      sans-serif;
    color: var(--text-dark);
    margin: 0;
    padding: 0;
  }

  .info-container {
    margin: 0px;
    padding: 15px;
    border: 2px solid var(--border-light);
    border-radius: 20px;
    background: var(--info-bg);
    box-shadow: 0 10px 40px var(--shadow-light);
    max-height: 85vh;
    overflow-y: auto;
    position: relative;
    transition: all 0.3s ease;
  }

  .info-container::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 5px;
    background: linear-gradient(
      90deg,
      var(--text-red),
      var(--map-darkest),
      var(--map-medium)
    );
    border-radius: 20px 20px 0 0;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px;
    background: linear-gradient(135deg, var(--map-lightest), var(--info-bg));
    border-radius: 16px;
    border: 2px solid var(--border-light);
    margin: 20px 0;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid var(--map-lightest);
    border-top: 4px solid var(--text-red);
    border-radius: 50%;
    animation: spin 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    margin-bottom: 20px;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .province-header {
    margin-bottom: 32px;
    padding-bottom: 24px;
    border-bottom: 3px solid var(--border-medium);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
  }

  .province-header h2 {
    margin: 0;
    color: var(--text-red);
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.5px;
    text-shadow: 1px 1px 2px var(--shadow-light);
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .header-buttons {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .reset-btn,
  .itinerary-btn,
  .complete-btn,
  .cancel-btn,
  .search-btn,
  .back-btn,
  .hotel-btn,
  .external-search-btn,
  .food-tag-btn,
  .create-itinerary-btn,
  .cancel-date-btn,
  .print-btn,
  .new-itinerary-btn,
  .cancel-itinerary-btn {
    padding: 14px 28px;
    border-radius: 14px;
    font-weight: 600;
    font-size: 15px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: none;
    position: relative;
    overflow: hidden;
    letter-spacing: 0.3px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 120px;
  }

  .reset-btn {
    background: linear-gradient(135deg, var(--map-medium), var(--map-darkest));
    color: white;
    box-shadow: 0 6px 20px var(--shadow-light);
  }

  .reset-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 30px var(--shadow-medium);
  }

  .itinerary-btn {
    background: linear-gradient(135deg, var(--accent-green), #2e7d32);
    color: white;
    box-shadow: 0 6px 20px rgba(76, 175, 80, 0.3);
  }

  .itinerary-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 35px rgba(76, 175, 80, 0.4);
    background: linear-gradient(135deg, #43a047, #1b5e20);
  }

  .complete-btn {
    background: linear-gradient(135deg, var(--accent-blue), #1565c0);
    color: white;
    box-shadow: 0 6px 20px rgba(33, 150, 243, 0.3);
  }

  .complete-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 35px rgba(33, 150, 243, 0.4);
  }

  .cancel-btn {
    background: linear-gradient(135deg, var(--map-darkest), var(--text-red));
    color: white;
    box-shadow: 0 6px 20px var(--shadow-light);
  }

  .cancel-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 35px var(--shadow-medium);
  }

  .filter-section {
    background: linear-gradient(135deg, var(--map-lightest), var(--info-bg));
    padding: 28px;
    border-radius: 20px;
    margin-bottom: 32px;
    border: 2px solid var(--border-light);
    box-shadow: 0 8px 32px var(--shadow-light);
  }

  .filter-section h3 {
    margin: 0 0 24px 0;
    color: var(--text-red);
    font-size: 22px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 12px;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .filter-section h3::before {
    font-size: 20px;
  }

  .categories {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin: 20px 0;
  }

  .category-checkbox {
    display: flex;
    align-items: center;
    gap: 1px;
    cursor: pointer;
    padding: 12px 20px;
    background: var(--info-bg);
    border: 2px solid var(--border-light);
    border-radius: 14px;
    transition: all 0.3s ease;
    font-weight: 500;
    font-size: 15px;
  }

  .category-checkbox:hover {
    border-color: var(--text-red);
    background: var(--map-lightest);
    transform: translateY(-3px);
    box-shadow: 0 6px 20px var(--shadow-light);
  }

  .category-checkbox input[type="checkbox"]:checked + span {
    color: var(--text-red);
    font-weight: 600;
  }

  .category-checkbox input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: var(--text-red);
  }

  .rating-filter {
    margin: 10px 0;
    padding: 24px;
    background: var(--info-bg);
    border-radius: 25px;
    border: 2px solid var(--border-light);
  }

  .rating-filter label {
    display: block;
    margin-bottom: 5px;
    color: var(--text-red);
    font-weight: 600;
    font-size: 17px;
  }

  .rating-filter input[type="range"] {
    width: 100%;
    height: 8px;
    -webkit-appearance: none;
    appearance: none;
    background: linear-gradient(to right, var(--map-medium), var(--text-red));
    border-radius: 6px;
    outline: none;
  }

  .rating-filter input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 26px;
    height: 26px;
    background: var(--text-red);
    border-radius: 50%;
    cursor: pointer;
    border: 4px solid white;
    box-shadow: 0 4px 12px var(--shadow-medium);
  }

  .search-actions {
    margin-top: 28px;
  }

  .search-btn {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, var(--text-red), #8b0000);
    color: white;
    box-shadow: 0 8px 28px var(--shadow-medium);
    font-size: 17px;
    font-weight: 700;
    border-radius: 14px;
  }

  .search-btn:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px var(--shadow-dark);
    background: linear-gradient(135deg, #8b0000, #660000);
  }

  .places-list {
    margin-top: 32px;
  }

  .places-list h3 {
    margin: 0 0 24px 0;
    color: var(--text-red);
    font-size: 24px;
    font-weight: 700;
    padding-bottom: 16px;
    border-bottom: 3px solid var(--border-medium);
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .places-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 24px;
    margin-top: 24px;
  }

  .place-card {
    background: var(--info-bg);
    border: 2px solid var(--border-light);
    border-radius: 18px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }

  .place-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 24px 48px var(--shadow-medium);
    border-color: var(--text-red);
  }

  .place-card.selectable {
    border: 2px dashed var(--border-medium);
  }

  .place-card.selectable:hover {
    border-style: solid;
    border-color: var(--text-red);
  }

  .itinerary-checkbox {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 10;
    background: white;
    padding: 10px;
    border-radius: 50%;
    box-shadow: 0 6px 20px var(--shadow-medium);
  }

  .itinerary-checkbox input[type="checkbox"] {
    width: 22px;
    height: 22px;
    cursor: pointer;
    accent-color: var(--text-red);
  }

  .no-image {
    width: 100%;
    height: 220px;
    background: linear-gradient(135deg, var(--map-lightest), var(--map-medium));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 52px;
    color: var(--text-red);
    opacity: 0.7;
  }

  .place-card img {
    width: 100%;
    height: 220px;
    object-fit: cover;
    display: block;
    transition: transform 0.5s ease;
  }

  .place-card:hover img {
    transform: scale(1.06);
  }

  .place-info {
    padding: 24px;
  }

  .place-info h4 {
    margin: 0 0 16px 0;
    color: var(--text-red);
    font-size: 20px;
    font-weight: 700;
    line-height: 1.4;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .place-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 2px solid var(--border-light);
  }

  .category-badge {
    background: linear-gradient(135deg, var(--map-lightest), var(--map-medium));
    color: var(--text-red);
    padding: 8px 16px;
    border-radius: 22px;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.3px;
    border: 2px solid var(--border-medium);
  }

  .rating {
    color: var(--text-red);
    font-weight: 700;
    font-size: 16px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .rating::before {
    content: "⭐";
    font-size: 18px;
  }

  .place-description {
    color: var(--text-dark);
    font-size: 15px;
    line-height: 1.7;
    margin: 16px 0;
    opacity: 0.9;
    word-wrap: break-word;
  }

  .place-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 16px;
  }

  .tag {
    background: var(--map-lightest);
    color: var(--text-red);
    padding: 8px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
    border: 1px solid var(--border-light);
  }

  .selected-count {
    color: var(--text-red);
    font-weight: 700;
    font-size: 20px;
    margin-top: 12px;
  }

  .food-discovery-section {
    background: linear-gradient(135deg, var(--info-bg), var(--map-lightest));
    border-radius: 20px;
    padding: 28px;
    margin: 32px 0;
    border: 2px solid var(--border-medium);
    box-shadow: 0 10px 40px var(--shadow-light);
  }

  .food-discovery-section h3 {
    margin: 0 0 18px 0;
    color: var(--text-red);
    font-size: 22px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 12px;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .food-discovery-section h3::before {
    font-size: 24px;
  }

  .food-subtitle {
    color: var(--text-dark);
    opacity: 0.8;
    margin: 0 0 24px 0;
    font-size: 16px;
    line-height: 1.6;
  }

  .food-tag-buttons {
    display: flex;
    gap: 16px;
  }

  .food-tag-btn {
    flex: 1;
    padding: 20px;
    background: var(--info-bg);
    border: 2px solid var(--border-medium);
    color: var(--text-red);
    font-weight: 700;
    font-size: 17px;
    box-shadow: 0 6px 24px var(--shadow-light);
    border-radius: 14px;
  }

  .food-tag-btn:hover {
    background: linear-gradient(135deg, var(--map-lightest), var(--map-medium));
    border-color: var(--text-red);
    transform: translateY(-4px);
    box-shadow: 0 12px 36px var(--shadow-medium);
  }

  .food-results-section {
    background: linear-gradient(135deg, var(--info-bg), var(--map-lightest));
    border-radius: 20px;
    padding: 28px;
    margin: 28px 0;
    border: 2px solid var(--border-medium);
    box-shadow: 0 12px 48px var(--shadow-medium);
    animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .food-results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 3px solid var(--border-medium);
  }

  .food-results-header h3 {
    margin: 0;
    color: var(--text-red);
    font-size: 22px;
    font-weight: 700;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .food-results-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 24px;
    margin-top: 24px;
  }

  .food-result-card {
    background: var(--info-bg);
    border-radius: 16px;
    overflow: hidden;
    border: 2px solid var(--border-light);
    transition: all 0.3s ease;
    box-shadow: 0 8px 28px var(--shadow-light);
  }

  .food-result-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 16px 48px var(--shadow-medium);
    border-color: var(--text-red);
  }

  .food-image-wrapper {
    width: 100%;
    height: 220px;
    overflow: hidden;
    position: relative;
  }

  .food-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }

  .food-result-card:hover .food-image {
    transform: scale(1.08);
  }

  .food-image-fallback {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, var(--map-lightest), var(--map-medium));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 52px;
    color: var(--text-red);
  }

  .food-info {
    padding: 24px;
  }

  .food-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 16px;
  }

  .food-number {
    background: linear-gradient(135deg, var(--text-red), var(--map-darkest));
    color: white;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 16px;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(168, 34, 35, 0.3);
  }

  .food-name {
    margin: 0;
    color: var(--text-red);
    font-size: 20px;
    font-weight: 700;
    flex: 1;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .food-description {
    margin: 0;
    color: var(--text-dark);
    font-size: 15px;
    line-height: 1.7;
    opacity: 0.9;
    word-wrap: break-word;
  }

  .food-results-summary {
    margin-top: 28px;
    padding: 20px;
    background: linear-gradient(135deg, var(--map-lightest), var(--map-medium));
    border-radius: 14px;
    text-align: center;
    color: var(--text-red);
    font-weight: 700;
    font-size: 17px;
    border: 2px solid var(--border-medium);
  }

  .place-detail {
    animation: fadeIn 0.4s ease;
  }

  .back-btn {
    background: linear-gradient(135deg, var(--map-medium), var(--map-darkest));
    color: white;
    margin-bottom: 28px;
    padding: 16px 32px;
    border-radius: 16px;
    font-size: 17px;
    font-weight: 700;
  }

  .back-btn:hover {
    background: linear-gradient(135deg, var(--map-darkest), var(--text-red));
    transform: translateX(-4px);
    box-shadow: 0 12px 32px var(--shadow-medium);
  }

  .detail-image {
    width: 100%;
    height: 320px;
    object-fit: cover;
    border-radius: 22px;
    margin-bottom: 28px;
    border: 3px solid var(--border-medium);
    box-shadow: 0 16px 48px var(--shadow-medium);
  }

  .detail-no-image {
    width: 100%;
    height: 320px;
    background: linear-gradient(135deg, var(--map-lightest), var(--map-medium));
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 22px;
    font-size: 64px;
    color: var(--text-red);
    margin-bottom: 28px;
    border: 3px solid var(--border-medium);
  }

  .place-detail h2 {
    margin: 0 0 24px 0;
    color: var(--text-red);
    font-size: 34px;
    font-weight: 800;
    line-height: 1.2;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .detail-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 28px 0;
    padding: 24px;
    background: linear-gradient(135deg, var(--map-lightest), var(--info-bg));
    border-radius: 18px;
    border: 2px solid var(--border-medium);
  }

  .detail-category {
    background: linear-gradient(135deg, var(--text-red), var(--map-darkest));
    color: white;
    padding: 12px 28px;
    border-radius: 32px;
    font-weight: 800;
    font-size: 18px;
    letter-spacing: 0.5px;
  }

  .detail-rating {
    font-size: 22px;
    color: var(--text-red);
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .detail-section {
    margin: 32px 0;
    padding: 28px;
    background: linear-gradient(135deg, var(--info-bg), var(--map-lightest));
    border-radius: 20px;
    border-left: 6px solid var(--text-red);
    border: 2px solid var(--border-light);
    transition: all 0.3s ease;
  }

  .detail-section:hover {
    border-left-width: 8px;
    transform: translateX(4px);
    box-shadow: 0 12px 40px var(--shadow-light);
  }

  .detail-section h4 {
    margin: 0 0 20px 0;
    color: var(--text-red);
    font-size: 22px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 12px;
    word-wrap: break-word;
  }

  .detail-section p {
    margin: 0;
    color: var(--text-dark);
    font-size: 17px;
    line-height: 1.7;
    opacity: 0.9;
    word-wrap: break-word;
  }

  .hotel-btn {
    margin-top: 15px;
    background: linear-gradient(135deg, var(--accent-blue), #1565c0);
    color: white;
    padding: 18px 36px;
    border-radius: 16px;
    font-size: 18px;
    font-weight: 700;
    box-shadow: 0 10px 32px rgba(33, 150, 243, 0.3);
  }

  .hotel-btn:hover {
    background: linear-gradient(135deg, #1976d2, #0d47a1);
    transform: translateY(-4px);
    box-shadow: 0 16px 48px rgba(33, 150, 243, 0.4);
  }

  /* ===== HOTELS SECTION ===== */
  .hotels-box {
    margin: 36px 0;
    padding: 32px;
    background: linear-gradient(135deg, var(--info-bg), var(--map-lightest));
    border-radius: 22px;
    box-shadow: 0 20px 60px rgba(33, 150, 243, 0.15);
    animation: slideIn 0.4s ease;
  }

  .hotels-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 28px;
    padding-bottom: 24px;
    border-bottom: 3px solid var(--border-medium);
  }

  .hotels-header h3 {
    margin: 0;
    color: var(--text-red);
    font-size: 20px;
    font-weight: ̉600;
    word-wrap: break-word;
  }

  .hotels-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .hotel-card {
    background: var(--info-bg);
    border-radius: 18px;
    padding: 24px;
    border: 2px solid var(--border-light);
    transition: all 0.3s ease;
  }

  .hotel-card:hover {
    transform: translateX(8px);
    border-color: var(--accent-blue);
    box-shadow: 0 12px 40px rgba(33, 150, 243, 0.15);
  }

  .hotel-info h4 {
    margin: 0 0 16px 0;
    color: var(--text-red);
    font-size: 20px;
    font-weight: 700;
    word-wrap: break-word;
  }

  .hotel-address {
    color: var(--text-dark);
    opacity: 0.8;
    font-size: 16px;
    margin: 10px 0;
    display: flex;

    align-items: center;
    gap: 10px;
  }

  .hotel-address::before {
    content: "📍";
  }

  .hotel-description {
    color: var(--text-dark);
    font-size: 15px;
    line-height: 1.7;
    margin: 16px 0 0 0;
    padding: 16px;
    background: var(--map-lightest);
    border-radius: 14px;
    border-left: 4px solid var(--accent-blue);
  }

  .hotels-summary {
    margin-top: 28px;
    padding: 24px;
    background: linear-gradient(135deg, var(--map-lightest), var(--map-medium));
    border-radius: 16px;
    text-align: center;
    color: var(--text-red);
    font-weight: 700;
    font-size: 18px;
    border: 2px solid var(--border-medium);
  }

  .no-results {
    text-align: center;
    padding: 48px;
    background: linear-gradient(135deg, var(--map-lightest), var(--info-bg));
    border-radius: 22px;
    border: 2px solid var(--border-medium);
    margin: 24px 0;
  }

  .no-results button {
    background: linear-gradient(135deg, var(--text-red), var(--map-darkest));
    color: white;
    padding: 16px 32px;
    border-radius: 16px;
    font-weight: 700;
    margin-top: 24px;
    font-size: 16px;
  }

  .placeholder h3 {
    color: var(--text-red);
    font-size: 20px;
    font-weight: 700;
    text-align: center;
    margin: 0 auto;
    padding: 24px;
    line-height: 1.6;
    max-width: 360px;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  @media (max-width: 1024px) {
    .places-grid {
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    .food-results-list {
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }
  }

  @media (max-width: 768px) {
    .info-container {
      margin: 16px;
      padding: 24px;
      max-height: 80vh;
    }

    .province-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
    }

    .header-buttons {
      width: 100%;
      justify-content: flex-start;
    }

    .date-selection {
      grid-template-columns: 1fr;
      gap: 20px;
    }

    .date-popup-actions {
      flex-direction: column;
      gap: 16px;
    }

    .create-itinerary-btn,
    .cancel-date-btn {
      width: 100%;
      min-width: auto;
    }

    .option-buttons {
      flex-direction: column;
    }

    .option-btn {
      width: 100%;
    }

    .food-tag-buttons {
      flex-direction: column;
    }

    .place-content h4 {
      font-size: 20px;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(40px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .categories-container {
      margin: 15px 0;
      padding: 20px;
      background: var(--info-bg);
      border-radius: 16px;
      border: 2px solid var(--border-light);
    }

    .category-group {
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid var(--border-light);
    }

    .category-group:last-child {
      margin-bottom: 0;
      border-bottom: none;
      padding-bottom: 0;
    }

    .category-group h4 {
      margin: 0 0 12px 0;
      color: var(--text-red);
      font-size: 16px;
      font-weight: 600;
      text-align: left;
    }

    .subcategory-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 5px;
    }

    .subcategory-checkbox {
      display: inline-flex;
      align-items: center;
      padding: 8px 16px;
      background: var(--map-lightest);
      border: 2px solid var(--border-medium);
      border-radius: 20px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-dark);
      transition: all 0.2s;
      text-align: left;
    }

    .subcategory-checkbox:hover {
      border-color: var(--text-red);
      background: var(--map-medium);
    }

    .subcategory-checkbox input {
      margin-right: 8px;
      width: 16px;
      height: 16px;
      accent-color: var(--text-red);
    }

    .subcategory-checkbox.checked {
      background: var(--text-red);
      color: white;
      border-color: var(--text-red);
    }

    .place-subcategories {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
    }

    .subcategory-tag {
      display: inline-block;
      padding: 4px 10px;
      background: var(--map-lightest);
      color: var(--text-red);
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      border: 1px solid var(--border-light);
      text-align: left;
    }

    .detail-section.subcategories {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 15px;
      text-align: left;
    }

    .detail-section.subcategories .subcategory-tag {
      padding: 6px 14px;
      background: var(--text-red);
      color: white;
      font-size: 12px;
      border: none;
    }

    @media (max-width: 768px) {
      .categories-container {
        padding: 16px;
      }

      .category-group {
        margin-bottom: 16px;
      }

      .category-group h4 {
        font-size: 15px;
      }

      .subcategory-buttons {
        gap: 6px;
      }

      .subcategory-checkbox {
        padding: 6px 12px;
        font-size: 13px;
      }

      .subcategory-checkbox input {
        margin-right: 6px;
        width: 14px;
        height: 14px;
      }
    }
  }

  .subcategory-checkbox {
    display: inline-flex;
    align-items: center;
    padding: 8px 16px;
    background: white;
    border: 2px solid var(--border-medium);
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    color: var(--text-dark);
    transition: all 0.2s ease;
    margin: 4px;
  }

  .subcategory-checkbox:hover {
    border-color: var(--text-red);
    background: var(--map-lightest);
  }

  .subcategory-checkbox.checked {
    background: var(--text-red);
    color: white;
    border-color: var(--text-red);
  }

  .subcategory-checkbox input[type="checkbox"] {
    margin-right: 8px;
    width: 16px;
    height: 16px;
    cursor: pointer;
  }
</style>
