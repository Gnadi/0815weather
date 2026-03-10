import { useState, useEffect } from 'react';

const STORAGE_KEY = 'weather_favourites';

export function useFavourites() {
  const [favourites, setFavourites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favourites));
  }, [favourites]);

  function addFavourite({ lat, lon, city, country }) {
    setFavourites(prev => {
      if (prev.some(f => f.lat === lat && f.lon === lon)) return prev;
      return [...prev, { lat, lon, city, country }];
    });
  }

  function removeFavourite(lat, lon) {
    setFavourites(prev => prev.filter(f => !(f.lat === lat && f.lon === lon)));
  }

  function isFavourite(lat, lon) {
    return favourites.some(f => f.lat === lat && f.lon === lon);
  }

  return { favourites, addFavourite, removeFavourite, isFavourite };
}
