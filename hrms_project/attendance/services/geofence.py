import math
from typing import Optional, Tuple


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def check_geofence(
    lat: Optional[float],
    lng: Optional[float],
    work_location,
) -> Tuple[bool, Optional[str]]:
    if not work_location or work_location.latitude is None or work_location.longitude is None:
        return True, None

    if lat is None or lng is None:
        return False, 'GPS coordinates are required for this work location.'

    distance = haversine_meters(lat, lng, work_location.latitude, work_location.longitude)
    radius = work_location.radius_meters or 200
    if distance <= radius:
        return True, None
    return False, f'You are {int(distance)}m away from the office (allowed: {radius}m).'
