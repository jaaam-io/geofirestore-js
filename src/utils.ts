import * as firebase from 'firebase';

import { GeoFirestoreObj, QueryCriteria } from './interfaces';

// Default geohash length
export const g_GEOHASH_PRECISION: number = 10;

// Characters used in location geohashes
export const g_BASE32: string = '0123456789bcdefghjkmnpqrstuvwxyz';

// The meridional circumference of the earth in meters
export const g_EARTH_MERI_CIRCUMFERENCE: number = 40007860;

// Length of a degree latitude at the equator
export const g_METERS_PER_DEGREE_LATITUDE: number = 110574;

// Number of bits per geohash character
export const g_BITS_PER_CHAR: number = 5;

// Maximum length of a geohash in bits
export const g_MAXIMUM_BITS_PRECISION: number = 22 * g_BITS_PER_CHAR;

// Equatorial radius of the earth in meters
export const g_EARTH_EQ_RADIUS: number = 6378137.0;

// The following value assumes a polar radius of
// const g_EARTH_POL_RADIUS = 6356752.3;
// The formulate to calculate g_E2 is
// g_E2 == (g_EARTH_EQ_RADIUS^2-g_EARTH_POL_RADIUS^2)/(g_EARTH_EQ_RADIUS^2)
// The exact value is used here to avoid rounding errors
export const g_E2: number = 0.00669447819799;

// Cutoff for rounding errors on double calculations
export const g_EPSILON: number = 1e-12;

Math.log2 = Math.log2 || function (x) {
  return Math.log(x) / Math.log(2);
};

/**
 * Validates the inputted key and throws an error, or returns boolean, if it is invalid.
 *
 * @param key The key to be verified.
 * @param flag Tells function to send up boolean if valid instead of throwing an error.
 */
export function validateKey(key: string, flag: boolean = false): boolean {
  let error: string;

  if (typeof key !== 'string') {
    error = 'key must be a string';
  } else if (key.length === 0) {
    error = 'key cannot be the empty string';
  } else if (1 + g_GEOHASH_PRECISION + key.length > 755) {
    // Firebase can only stored child paths up to 768 characters
    // The child path for this key is at the least: 'i/<geohash>key'
    error = 'key is too long to be stored in Firebase';
  } else if (/[\[\].#$\/\u0000-\u001F\u007F]/.test(key)) {
    // Firebase does not allow node keys to contain the following characters
    error = 'key cannot contain any of the following characters: . # $ ] [ /';
  }

  if (typeof error !== 'undefined' && !flag) {
    throw new Error('Invalid GeoFire key \'' + key + '\': ' + error);
  } else {
    return !error;
  }
};

/**
 * Validates the inputted location and throws an error, or returns boolean, if it is invalid.
 *
 * @param location The Firestore GeoPoint to be verified.
 * @param flag Tells function to send up boolean if valid instead of throwing an error.
 */
export function validateLocation(location: firebase.firestore.GeoPoint, flag: boolean = false): boolean {
  let error: string;

  if (!location) {
    error = 'GeoPoint must exist';
  } else if (typeof location.latitude === 'undefined') {
    error = 'latitude must exist on GeoPoint';
  } else if (typeof location.longitude === 'undefined') {
    error = 'longitude must exist on GeoPoint';
  } else {
    const latitude = location.latitude;
    const longitude = location.longitude;

    if (typeof latitude !== 'number' || isNaN(latitude)) {
      error = 'latitude must be a number';
    } else if (latitude < -90 || latitude > 90) {
      error = 'latitude must be within the range [-90, 90]';
    } else if (typeof longitude !== 'number' || isNaN(longitude)) {
      error = 'longitude must be a number';
    } else if (longitude < -180 || longitude > 180) {
      error = 'longitude must be within the range [-180, 180]';
    }
  }

  if (typeof error !== 'undefined' && !flag) {
    throw new Error('Invalid GeoFire location: ' + error);
  } else {
    return !error;
  }
};

/**
 * Validates the inputted geohash and throws an error, or returns boolean, if it is invalid.
 *
 * @param geohash The geohash to be validated.
 * @param flag Tells function to send up boolean if valid instead of throwing an error.
 */
export function validateGeohash(geohash: string, flag: boolean = false): boolean {
  let error;

  if (typeof geohash !== 'string') {
    error = 'geohash must be a string';
  } else if (geohash.length === 0) {
    error = 'geohash cannot be the empty string';
  } else {
    for (const letter of geohash) {
      if (g_BASE32.indexOf(letter) === -1) {
        error = 'geohash cannot contain \'' + letter + '\'';
      }
    }
  }

  if (typeof error !== 'undefined' && !flag) {
    throw new Error('Invalid GeoFire geohash \'' + geohash + '\': ' + error);
  } else {
    return !error;
  }
};

/**
 * Validates the inputted GeoFirestore object and throws an error, or returns boolean, if it is invalid.
 *
 * @param geoFirestoreObj The GeoFirestore object to be validated.
 * @param flag Tells function to send up boolean if valid instead of throwing an error.
 */
export function validateGeoFirestoreObject(geoFirestoreObj: GeoFirestoreObj, flag: boolean = false): boolean {
  let error: string;

  error = (!validateGeohash(geoFirestoreObj.g, true)) ? 'invalid geohash on object' : null;
  error = (!validateLocation(geoFirestoreObj.l, true)) ? 'invalid location on object' : error;

  if (!geoFirestoreObj || !('d' in geoFirestoreObj) || typeof geoFirestoreObj.d !== 'object') {
    error = 'no valid document found';
  }

  if (typeof error !== 'undefined' && !flag) {
    throw new Error('Invalid GeoFirestore object: ' + error);
  } else {
    return !error;
  }
};

/**
 * Validates the inputted query criteria and throws an error if it is invalid.
 *
 * @param newQueryCriteria The criteria which specifies the query's center and/or radius.
 * @param requireCenterAndRadius The criteria which center and radius required.
 */
export function validateCriteria(newQueryCriteria: QueryCriteria, requireCenterAndRadius: boolean = false): void {
  if (typeof newQueryCriteria !== 'object') {
    throw new Error('query criteria must be an object');
  } else if (typeof newQueryCriteria.center === 'undefined' && typeof newQueryCriteria.radius === 'undefined') {
    throw new Error('radius and/or center must be specified');
  } else if (requireCenterAndRadius && (typeof newQueryCriteria.center === 'undefined' || typeof newQueryCriteria.radius === 'undefined')) {
    throw new Error('query criteria for a new query must contain both a center and a radius');
  }

  // Throw an error if there are any extraneous attributes
  const keys: string[] = Object.keys(newQueryCriteria);
  for (const key of keys) {
    if (key !== 'center' && key !== 'radius') {
      throw new Error('Unexpected attribute \'' + key + '\' found in query criteria');
    }
  }

  // Validate the 'center' attribute
  if (typeof newQueryCriteria.center !== 'undefined') {
    validateLocation(newQueryCriteria.center);
  }

  // Validate the 'radius' attribute
  if (typeof newQueryCriteria.radius !== 'undefined') {
    if (typeof newQueryCriteria.radius !== 'number' || isNaN(newQueryCriteria.radius)) {
      throw new Error('radius must be a number');
    } else if (newQueryCriteria.radius < 0) {
      throw new Error('radius must be greater than or equal to 0');
    }
  }
};

/**
 * Converts degrees to radians.
 *
 * @param degrees The number of degrees to be converted to radians.
 * @returns The number of radians equal to the inputted number of degrees.
 */
export function degreesToRadians(degrees: number): number {
  if (typeof degrees !== 'number' || isNaN(degrees)) {
    throw new Error('Error: degrees must be a number');
  }

  return (degrees * Math.PI / 180);
};

/**
 * Generates a geohash of the specified precision/string length from the inputted GeoPoint.
 *
 * @param location The GeoPoint to encode into a geohash.
 * @param precision The length of the geohash to create. If no precision is specified, the
 * global default is used.
 * @returns The geohash of the inputted location.
 */
export function encodeGeohash(location: firebase.firestore.GeoPoint, precision: number = g_GEOHASH_PRECISION): string {
  validateLocation(location);
  if (typeof precision !== 'undefined') {
    if (typeof precision !== 'number' || isNaN(precision)) {
      throw new Error('precision must be a number');
    } else if (precision <= 0) {
      throw new Error('precision must be greater than 0');
    } else if (precision > 22) {
      throw new Error('precision cannot be greater than 22');
    } else if (Math.round(precision) !== precision) {
      throw new Error('precision must be an integer');
    }
  }

  const latitudeRange = {
    min: -90,
    max: 90
  };
  const longitudeRange = {
    min: -180,
    max: 180
  };
  let hash: string = '';
  let hashVal = 0;
  let bits: number = 0;
  let even: number | boolean = 1;

  while (hash.length < precision) {
    const val = even ? location.longitude : location.latitude;
    const range = even ? longitudeRange : latitudeRange;
    const mid = (range.min + range.max) / 2;

    if (val > mid) {
      hashVal = (hashVal << 1) + 1;
      range.min = mid;
    } else {
      hashVal = (hashVal << 1) + 0;
      range.max = mid;
    }

    even = !even;
    if (bits < 4) {
      bits++;
    } else {
      bits = 0;
      hash += g_BASE32[hashVal];
      hashVal = 0;
    }
  }

  return hash;
};

/**
 * Calculates the number of degrees a given distance is at a given latitude.
 *
 * @param distance The distance to convert.
 * @param latitude The latitude at which to calculate.
 * @returns The number of degrees the distance corresponds to.
 */
export function metersToLongitudeDegrees(distance: number, latitude: number): number {
  const radians = degreesToRadians(latitude);
  const num = Math.cos(radians) * g_EARTH_EQ_RADIUS * Math.PI / 180;
  const denom = 1 / Math.sqrt(1 - g_E2 * Math.sin(radians) * Math.sin(radians));
  const deltaDeg = num * denom;
  if (deltaDeg < g_EPSILON) {
    return distance > 0 ? 360 : 0;
  }
  else {
    return Math.min(360, distance / deltaDeg);
  }
};

/**
 * Calculates the bits necessary to reach a given resolution, in meters, for the longitude at a
 * given latitude.
 *
 * @param resolution The desired resolution.
 * @param latitude The latitude used in the conversion.
 * @return The bits necessary to reach a given resolution, in meters.
 */
export function longitudeBitsForResolution(resolution: number, latitude: number): number {
  const degs = metersToLongitudeDegrees(resolution, latitude);
  return (Math.abs(degs) > 0.000001) ? Math.max(1, Math.log2(360 / degs)) : 1;
};

/**
 * Calculates the bits necessary to reach a given resolution, in meters, for the latitude.
 *
 * @param resolution The bits necessary to reach a given resolution, in meters.
 * @returns Bits necessary to reach a given resolution, in meters, for the latitude.
 */
export function latitudeBitsForResolution(resolution: number): number {
  return Math.min(Math.log2(g_EARTH_MERI_CIRCUMFERENCE / 2 / resolution), g_MAXIMUM_BITS_PRECISION);
};

/**
 * Wraps the longitude to [-180,180].
 *
 * @param longitude The longitude to wrap.
 * @returns longitude The resulting longitude.
 */
export function wrapLongitude(longitude: number): number {
  if (longitude <= 180 && longitude >= -180) {
    return longitude;
  }
  const adjusted = longitude + 180;
  if (adjusted > 0) {
    return (adjusted % 360) - 180;
  }
  else {
    return 180 - (-adjusted % 360);
  }
};

/**
 * Calculates the maximum number of bits of a geohash to get a bounding box that is larger than a
 * given size at the given coordinate.
 *
 * @param coordinate The coordinate as a Firestore GeoPoint.
 * @param size The size of the bounding box.
 * @returns The number of bits necessary for the geohash.
 */
export function boundingBoxBits(coordinate: firebase.firestore.GeoPoint, size: number): number {
  const latDeltaDegrees = size / g_METERS_PER_DEGREE_LATITUDE;
  const latitudeNorth = Math.min(90, coordinate.latitude + latDeltaDegrees);
  const latitudeSouth = Math.max(-90, coordinate.latitude - latDeltaDegrees);
  const bitsLat = Math.floor(latitudeBitsForResolution(size)) * 2;
  const bitsLongNorth = Math.floor(longitudeBitsForResolution(size, latitudeNorth)) * 2 - 1;
  const bitsLongSouth = Math.floor(longitudeBitsForResolution(size, latitudeSouth)) * 2 - 1;
  return Math.min(bitsLat, bitsLongNorth, bitsLongSouth, g_MAXIMUM_BITS_PRECISION);
};

/**
 * Calculates eight points on the bounding box and the center of a given circle. At least one
 * geohash of these nine coordinates, truncated to a precision of at most radius, are guaranteed
 * to be prefixes of any geohash that lies within the circle.
 *
 * @param center The center given as Firestore GeoPoint.
 * @param radius The radius of the circle.
 * @returns The eight bounding box points.
 */
export function boundingBoxCoordinates(center: firebase.firestore.GeoPoint, radius: number): firebase.firestore.GeoPoint[] {
  const latDegrees = radius / g_METERS_PER_DEGREE_LATITUDE;
  const latitudeNorth = Math.min(90, center.latitude + latDegrees);
  const latitudeSouth = Math.max(-90, center.latitude - latDegrees);
  const longDegsNorth = metersToLongitudeDegrees(radius, latitudeNorth);
  const longDegsSouth = metersToLongitudeDegrees(radius, latitudeSouth);
  const longDegs = Math.max(longDegsNorth, longDegsSouth);
  return [
    new firebase.firestore.GeoPoint(center.latitude, center.longitude),
    new firebase.firestore.GeoPoint(center.latitude, wrapLongitude(center.longitude - longDegs)),
    new firebase.firestore.GeoPoint(center.latitude, wrapLongitude(center.longitude + longDegs)),
    new firebase.firestore.GeoPoint(latitudeNorth, center.longitude),
    new firebase.firestore.GeoPoint(latitudeNorth, wrapLongitude(center.longitude - longDegs)),
    new firebase.firestore.GeoPoint(latitudeNorth, wrapLongitude(center.longitude + longDegs)),
    new firebase.firestore.GeoPoint(latitudeSouth, center.longitude),
    new firebase.firestore.GeoPoint(latitudeSouth, wrapLongitude(center.longitude - longDegs)),
    new firebase.firestore.GeoPoint(latitudeSouth, wrapLongitude(center.longitude + longDegs))
  ];
};

/**
 * Calculates the bounding box query for a geohash with x bits precision.
 *
 * @param geohash The geohash whose bounding box query to generate.
 * @param bits The number of bits of precision.
 * @returns A [start, end] pair of geohashes.
 */
export function geohashQuery(geohash: string, bits: number): string[] {
  validateGeohash(geohash);
  const precision = Math.ceil(bits / g_BITS_PER_CHAR);
  if (geohash.length < precision) {
    return [geohash, geohash + '~'];
  }
  geohash = geohash.substring(0, precision);
  const base = geohash.substring(0, geohash.length - 1);
  const lastValue = g_BASE32.indexOf(geohash.charAt(geohash.length - 1));
  const significantBits = bits - (base.length * g_BITS_PER_CHAR);
  const unusedBits = (g_BITS_PER_CHAR - significantBits);
  // delete unused bits
  const startValue = (lastValue >> unusedBits) << unusedBits;
  const endValue = startValue + (1 << unusedBits);
  if (endValue > 31) {
    return [base + g_BASE32[startValue], base + '~'];
  } else {
    return [base + g_BASE32[startValue], base + g_BASE32[endValue]];
  }
};

/**
 * Calculates a set of queries to fully contain a given circle. A query is a [start, end] pair
 * where any geohash is guaranteed to be lexiographically larger then start and smaller than end.
 *
 * @param center The center given as a GeoPoint.
 * @param radius The radius of the circle.
 * @return An array of geohashes containing a GeoPoint.
 */
export function geohashQueries(center: firebase.firestore.GeoPoint, radius: number): string[][] {
  validateLocation(center);
  const queryBits = Math.max(1, boundingBoxBits(center, radius));
  const geohashPrecision = Math.ceil(queryBits / g_BITS_PER_CHAR);
  const coordinates = boundingBoxCoordinates(center, radius);
  const queries = coordinates.map(function (coordinate) {
    return geohashQuery(encodeGeohash(coordinate, geohashPrecision), queryBits);
  });
  // remove duplicates
  return queries.filter(function (query, index) {
    return !queries.some(function (other, otherIndex) {
      return index > otherIndex && query[0] === other[0] && query[1] === other[1];
    });
  });
};

/**
 * Encodes a location and geohash as a GeoFire object.
 *
 * @param location The location as [latitude, longitude] pair.
 * @param geohash The geohash of the location.
 * @returns The location encoded as GeoFire object.
 */
export function encodeGeoFireObject(location: firebase.firestore.GeoPoint, geohash: string, document: any): GeoFirestoreObj {
  validateLocation(location);
  validateGeohash(geohash);
  return { g: geohash, l: location, d: document };
}

/**
 * Decodes the document given as GeoFirestore object. Returns null if decoding fails.
 *
 * @param geoFirestoreObj The document encoded as GeoFirestore object.
 * @returns The Firestore document or null if decoding fails.
 */
export function decodeGeoFirestoreObject(geoFirestoreObj: GeoFirestoreObj): any {
  if (validateGeoFirestoreObject(geoFirestoreObj, true)) {
    return geoFirestoreObj.d;
  } else {
    throw new Error('Unexpected location object encountered: ' + JSON.stringify(geoFirestoreObj));
  }
}

/**
 * Returns the id of a Firestore snapshot across SDK versions.
 *
 * @param snapshot A Firestore snapshot.
 * @returns The Firestore snapshot's id.
 */
export function geoFirestoreGetKey(snapshot: firebase.firestore.DocumentSnapshot): string {
  let id: string;
  if (typeof snapshot.id === 'string' || snapshot.id === null) {
    id = snapshot.id;
  }
  return id;
}

/**
 * Returns the key of a document that is a GeoPoint.
 *
 * @param document A GeoFirestore document.
 * @returns The key for the location field of a document. 
 */
export function findCoordinatesKey(document: any, customKey?: string): string {
  let error: string;
  let key: string;

  if (document && typeof document === 'object') {
    if (customKey in document) {
      key = customKey
    } else if ('coordinates' in document) {
      key = 'coordinates';
    } else {
      error = 'no valid key exists'
    }
  } else {
    error = 'document not an object';
  }

  if (!validateLocation(document[key], true)) {
    error = key + ' is not a valid GeoPoint';
  }

  if (typeof error !== 'undefined') {
    throw new Error('Invalid GeoFirestore document: ' + error);
  }

  return key;
}