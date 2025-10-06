// Google Maps API type declarations
declare global {
  interface Window {
    google: typeof google
  }
}

declare namespace google {
  namespace maps {
    class Map {
      constructor(mapDiv: HTMLElement, opts?: MapOptions)
      setCenter(latlng: LatLng | LatLngLiteral): void
      addListener(eventName: string, handler: (e: any) => void): void
    }

    class Marker {
      constructor(opts?: MarkerOptions)
      setMap(map: Map | null): void
    }

    class Circle {
      constructor(opts?: CircleOptions)
      setRadius(radius: number): void
    }

    namespace places {
      class Autocomplete {
        constructor(inputField: HTMLInputElement, opts?: AutocompleteOptions)
        bindTo(key: string, target: any): void
        addListener(eventName: string, handler: () => void): void
        getPlace(): PlaceResult
      }

      interface PlaceResult {
        place_id?: string
        name?: string
        formatted_address?: string
        geometry?: {
          location?: LatLng
        }
      }

      interface AutocompleteOptions {
        types?: string[]
        fields?: string[]
      }
    }

    class Geocoder {
      geocode(
        request: GeocoderRequest,
        callback: (results: GeocoderResult[] | null, status: GeocoderStatus) => void
      ): void
    }

    interface MapOptions {
      center?: LatLng | LatLngLiteral
      zoom?: number
      mapTypeControl?: boolean
      streetViewControl?: boolean
      fullscreenControl?: boolean
      styles?: MapTypeStyle[]
    }

    interface MarkerOptions {
      position?: LatLng | LatLngLiteral
      map?: Map
      title?: string
      icon?: any
    }

    interface CircleOptions {
      strokeColor?: string
      strokeOpacity?: number
      strokeWeight?: number
      fillColor?: string
      fillOpacity?: number
      map?: Map
      center?: LatLng | LatLngLiteral
      radius?: number
    }

    interface LatLng {
      lat(): number
      lng(): number
    }

    interface LatLngLiteral {
      lat: number
      lng: number
    }

    interface MapMouseEvent {
      latLng?: LatLng
    }

    interface GeocoderRequest {
      location?: LatLng | LatLngLiteral
    }

    interface GeocoderResult {
      formatted_address: string
    }

    interface MapTypeStyle {
      featureType?: string
      elementType?: string
      stylers?: any[]
    }

    enum SymbolPath {
      CIRCLE = 'circle'
    }

    type GeocoderStatus = string
  }
}

export {}
