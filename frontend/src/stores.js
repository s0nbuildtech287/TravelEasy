// frontend/my-vietnam-map/src/stores.js
import { writable } from 'svelte/store';

export const selectedProvince = writable(null);
export const touristPlaces = writable([]);
export const selectedPlace = writable(null);
export const nearbyHotels = writable([]);
export const nearbyEateries = writable([]);
export const userLocation = writable(null);