/**
 * Mapa - Mapa da Inclusão
 * Versão: 1.0.0
 */

class MapaAppClass {
  constructor() {
    this.map = null;
    this.markersLayer = null;
    this.categories = [];
    this.onMarkerClick = null;
    this.onLocationClick = null;
    this.selectedMarker = null;
    this.defaultCenter = [-6.3616, -39.2925];
    this.defaultZoom = 14;
  }

  setCategories(categories) {
    this.categories = categories || [];
  }

  getCategoryColor(categoryId) {
    const category = this.categories.find((c) => c.id === categoryId);
    return category ? category.cor : "#3498db";
  }

  getCategoryIcon(categoryId) {
    const category = this.categories.find((c) => c.id === categoryId);
    return category ? category.icone : "📍";
  }

  init(mapElement, options = {}) {
    if (!mapElement) {
      throw new Error("Elemento do mapa não encontrado");
    }

    const center = options.center || this.defaultCenter;
    const zoom = options.zoom || this.defaultZoom;

    if (!window.L) {
      throw new Error("Leaflet não está carregado");
    }

    if (this.map) {
      this.map.remove();
    }

    this.map = L.map(mapElement, {
      center,
      zoom,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);

    this.map.on("click", (event) => {
      if (this.onLocationClick) {
        this.onLocationClick({ lat: event.latlng.lat, lng: event.latlng.lng });
      }
    });

    return this.map;
  }

  centerOn(lat, lng, zoom = this.defaultZoom) {
    if (this.map) {
      this.map.setView([lat, lng], zoom);
    }
  }

  clearMarkers() {
    if (this.markersLayer) {
      this.markersLayer.clearLayers();
    }
    this.selectedMarker = null;
  }

  addMarkers(locations, options = {}) {
    this.clearMarkers();

    if (!locations || !locations.length) {
      if (options.fitBounds !== false) {
        this.centerOn(this.defaultCenter[0], this.defaultCenter[1], this.defaultZoom);
      }
      return [];
    }

    const markers = [];

    locations.forEach((location) => {
      const lat = Number(location.latitude);
      const lng = Number(location.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }

      const color = location.cor_pin || this.getCategoryColor(location.categoria);
      const icon = this.getCategoryIcon(location.categoria);

      const markerIcon = L.divIcon({
        className: "map-marker",
        html: `
          <div style="
            background-color: ${color};
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            font-size: 16px;
            color: white;
          ">${icon}</div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([lat, lng], { icon }).addTo(this.markersLayer);
      marker.bindPopup(`<strong>${Utils.sanitizeHTML(location.titulo || "Localização")}</strong>`);

      marker.on("click", () => {
        if (this.onMarkerClick) {
          this.onMarkerClick(location);
        }
      });

      markers.push(marker);
    });

    if (options.fitBounds !== false && markers.length > 0) {
      const group = L.featureGroup(markers);
      this.map.fitBounds(group.getBounds().pad(0.2));
    }

    return markers;
  }

  addSelectMarker(lat, lng) {
    if (!this.map) return;

    this.clearMarkers();

    const markerIcon = L.divIcon({
      className: "select-marker",
      html: `
        <div style="
          background-color: #e74c3c;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          font-size: 16px;
          color: white;
        ">📍</div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    this.selectedMarker = L.marker([lat, lng], { icon: markerIcon }).addTo(this.markersLayer);
    this.centerOn(lat, lng, 16);
  }

  async getUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalização não suportada"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (error) => {
          reject(error);
        },
      );
    });
  }
}

window.MapaApp = new MapaAppClass();
