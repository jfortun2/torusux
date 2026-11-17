import { useEffect, useState } from 'react';

export type TourFlags = {
  banner: boolean;
  outline: boolean;
  preview: boolean;
};

const DEFAULT_TOUR: TourFlags = {
  banner: true,
  outline: true,
  preview: true,
};

let tourState: TourFlags = { ...DEFAULT_TOUR };

export function readTour(): TourFlags {
  return tourState;
}

export function dismissTour(part: keyof TourFlags) {
  tourState = { ...tourState, [part]: false };
  window.dispatchEvent(new Event('torus-tour'));
}

export function useTour(): TourFlags {
  const [tour, setTour] = useState<TourFlags>(readTour);

  useEffect(() => {
    const sync = () => setTour(readTour());
    window.addEventListener('torus-tour', sync);
    return () => window.removeEventListener('torus-tour', sync);
  }, []);

  return tour;
}
