export type GeolocationErrorCode =
  | 'permission_denied'
  | 'position_unavailable'
  | 'timeout'
  | 'unsupported'
  | 'unknown';

export type GeolocationResult =
  | { ok: true; lat: number; lng: number; accuracy?: number | null }
  | { ok: false; code: GeolocationErrorCode; message: string };

export async function getCurrentPosition({
  timeoutMs = 12_000,
  enableHighAccuracy = true,
  maximumAgeMs = 0,
} = {}): Promise<GeolocationResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return {
      ok: false,
      code: 'unsupported',
      message: 'Location is not supported in this browser.',
    };
  }

  return await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          ok: true,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
        });
      },
      (err) => {
        const code = err?.code;
        if (code === 1) {
          resolve({
            ok: false,
            code: 'permission_denied',
            message: 'Location permission is denied. Please allow location access and try again.',
          });
          return;
        }
        if (code === 2) {
          resolve({
            ok: false,
            code: 'position_unavailable',
            message: 'Unable to determine your location. Please enable GPS and try again.',
          });
          return;
        }
        if (code === 3) {
          resolve({
            ok: false,
            code: 'timeout',
            message: 'Location request timed out. Please try again.',
          });
          return;
        }
        resolve({
          ok: false,
          code: 'unknown',
          message: 'Unable to fetch location. Please try again.',
        });
      },
      { timeout: timeoutMs, enableHighAccuracy, maximumAge: maximumAgeMs }
    );
  });
}

