import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { GoogleMap, MapInfoWindow, MapMarker } from '@angular/google-maps';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, AfterViewInit {
 // TEST VARIABLE
 @ViewChild(GoogleMap, { static: false }) map!: GoogleMap;
  @ViewChild(MapInfoWindow) private infoWindow!: MapInfoWindow;
  @ViewChild("autoCompleteField") autoCompleteField!: ElementRef;

  //#region Options
  public mapOptions!: google.maps.MapOptions;
  public polygonOptions!: google.maps.PolygonOptions;
  //#endregion Options

  public vertices: google.maps.LatLngLiteral[] = [];
  public searchArea: google.maps.LatLngLiteral[] = [];


  markers: any[] = [];


  public selectedPlace: any = null;
  currentDrawing!: google.maps.Polygon;

  // List of available restaurant types
  public restaurantTypes: Array<any> = [
    {
      name: "Cafe",
      type: "cafe",
      checked: false
    },
    {
      name: "Bar",
      type: "bar",
      checked: false
    },
    {
      name: "Bakery",
      type: "bakery",
      checked: false
    },
    {
      name: "Meal Delivery",
      type: "meal_delivery",
      checked: false
    },
    {
      name: "Meal Takeaway",
      type: "meal_takeaway",
      checked: false
    },
    {
      name: "Food",
      type: "food",
      checked: false
    }
    // Add more restaurant types here as needed
  ];

  public selectedTypes: string[] = []; // Selected restaurant types from the layer panel
  filteredResults: google.maps.places.PlaceResult[] = [];
  searchResults: google.maps.places.PlaceResult[] = [];

  private directionsService!: google.maps.DirectionsService;
  private directionsRenderer!: google.maps.DirectionsRenderer;
  private placeService!: google.maps.places.PlacesService;

  public isDropdownFilter: boolean = false;
  public isDropdownOptions: boolean = false;

  private defaultLocation: google.maps.LatLngLiteral = {
    lat: 10.309034,
    lng: 123.893828
  }

  private startingLocation!: google.maps.LatLngLiteral;
  constructor(private cdr: ChangeDetectorRef) {
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.initializeDependency();
    this.initializeAutocomplete();
    this.initializeMap();
    this.initializeDrawing();
    this.initializeDefault();
  }

  private initializeDependency(): void {
    this.directionsService = new google.maps.DirectionsService();
    this.directionsRenderer = new google.maps.DirectionsRenderer({ map: <google.maps.Map>this.map.googleMap, suppressMarkers: true, });
    this.directionsRenderer.setOptions({
      polylineOptions: {
        strokeColor: '#B5121B',
        strokeOpacity: 0.8,
        strokeWeight: 8,
      }
    });
    this.placeService = new google.maps.places.PlacesService(<google.maps.Map>this.map.googleMap);
  }

  private initializeAutocomplete(): void {
    this.startingLocation = this.defaultLocation;
    const autocomplete = new google.maps.places.Autocomplete(this.autoCompleteField.nativeElement);
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const startLocation = place.geometry?.location;
      this.startingLocation.lat = <number>startLocation?.lat()
      this.startingLocation.lng = <number>startLocation?.lng()
    });
  }

  private initializeMap(): void {
    this.mapOptions = {
      zoom: 9,
      center: {
        lat: 10.3157,
        lng: 123.8854
      },
      disableDoubleClickZoom: true,
    }
  }

  private initializeDrawing(): void {
    this.polygonOptions = {
      strokeColor: '#ED433B',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      fillColor: '#062E71',
      fillOpacity: 0.25,
    };

    const drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_CENTER,
        drawingModes: [google.maps.drawing.OverlayType.POLYGON]
      },
      polygonOptions: this.polygonOptions
    });

    drawingManager.setMap(<google.maps.Map>this.map.googleMap);

    const $this = this;
    google.maps.event.addListener(drawingManager, 'overlaycomplete', (event: google.maps.drawing.OverlayCompleteEvent) => {
      // Clear previous drawing
      if (this.currentDrawing) {
        this.currentDrawing.setMap(null);
      }

      // Store the new drawing
      this.currentDrawing = event.overlay as google.maps.Polygon;
      const bounds = $this.getPolygonBounds(this.currentDrawing);
      this.loadRestaurantData(bounds);
    });
  }

  private initializeDefault(): void {
    // Polygon coordinates that covers whole cebu area
    this.searchArea = [
      { lat: 10.478004, lng: 123.735241 },
      { lat: 10.481036, lng: 124.023496 },
      { lat: 10.200497, lng: 124.014247},
      { lat: 10.194428, lng: 123.746032 }
    ];

    // Create a LatLngBounds object from the polygon coordinates
    const bounds = new google.maps.LatLngBounds();
    this.searchArea.forEach((point: any) => bounds.extend(point));

    this.loadRestaurantData(bounds);
  }

  private loadRestaurantData(bounds: google.maps.LatLngBounds): void {
    // Perform a search within the polygon bounds
    this.markers = [];
    const request: google.maps.places.TextSearchRequest = {
      bounds: bounds,
      query: 'restaurants',
      type: "restaurant"
    };

    this.placeService.textSearch(request, (results, status, pagination) => {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        this.searchResults = <google.maps.places.PlaceResult[]>results;
        this.plotMarker(results);
      }
    });
    this.cdr.detectChanges();
  }

  plotMarker(results: any) {
    if(results.length > 0) {
      // Fit the map bounds to the markers
      const bounds = new google.maps.LatLngBounds();
      for (const place of results) {
        bounds.extend(place.geometry?.location);
        // Process each restaurant place
        var coord: any = place?.geometry?.location?.toJSON();
        if (coord != null)  {
          this.markers.push({
            placeId: place.place_id,
            position: place.geometry?.location,
            label: {
              className: "marker-label",
              text: place.name
            },
            options: {
              animation: google.maps.Animation.DROP,
            },
          });
        }
      }
      this.map.fitBounds(bounds);
    }
    else {
      this.map.panTo({ lat: 10.3157, lng: 123.8854 });
    }
    this.cdr.detectChanges();
  }

  openInfoWindow(marker: MapMarker, markerItem: any) {
    if (this.infoWindow != undefined) {
      const request = {
        placeId: markerItem.placeId,
      };

      // Call the PlacesService getDetails method
      this.placeService.getDetails(request, (placeDetails, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          this.selectedPlace = placeDetails;
          this.infoWindow.open(marker);
          this.cdr.detectChanges();
        }
      });
    }
  }

  public updateMarkers(): void {
    this.selectedTypes = this.restaurantTypes.filter(item => item.checked).map(type => type.type);
    if(this.selectedTypes.length > 0) {
      this.filteredResults = this.searchResults.filter((place) => {
        // Filter results based on selected types
        return place.types?.some((type) => this.selectedTypes.includes(type));
      });
    }
    else {
      this.filteredResults = this.searchResults;
    }

    this.markers = [];
    this.plotMarker(this.filteredResults);
  }

  private convertBoundsToLiteral(bounds: google.maps.LatLngBounds): google.maps.LatLngLiteral[] {
    const northeast: google.maps.LatLng = bounds.getNorthEast();
    const southwest: google.maps.LatLng = bounds.getSouthWest();

    const boundsArray: google.maps.LatLngLiteral[] = [
      { lat: northeast.lat(), lng: northeast.lng() },
      { lat: southwest.lat(), lng: northeast.lng() },
      { lat: southwest.lat(), lng: southwest.lng() },
      { lat: northeast.lat(), lng: southwest.lng() },
    ];
    return boundsArray;
  }

  getDirections(): void {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLat = this.startingLocation.lat;
        const currentLng = this.startingLocation.lng;

        const request = {
          origin: { lat: currentLat, lng: currentLng },
          destination: { lat: this.selectedPlace.geometry.location.toJSON().lat, lng: this.selectedPlace.geometry.location.toJSON().lng },
          travelMode: google.maps.TravelMode.DRIVING, // Adjust the travel mode as needed
        };

        this.directionsService.route(request, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK) {
            this.directionsRenderer.setDirections(result);

            let zoomLevel = <number>this.map.getZoom();
            const zoomInterval = setInterval(() => {
              if (zoomLevel > 0) {
                const newZoom = zoomLevel - 1;
                const newOptions: google.maps.MapOptions = { ...this.mapOptions, zoom: newZoom };
                this.map.options = newOptions;
                zoomLevel--;
              } else {
                clearInterval(zoomInterval);
              }
            }, 100);
          }
        });
      },
      (error) => {
        console.log(error);
      }
    );
  }

  public toggleDropdownFilter(): void {
    this.isDropdownFilter = !this.isDropdownFilter;
    this.isDropdownOptions = false;
  }

  private getPolygonBounds(polygon: google.maps.Polygon) {
    const bounds = new google.maps.LatLngBounds();
    const paths = polygon.getPaths();

    paths.forEach((path) => {
      path.forEach((latLng) => {
        bounds.extend(latLng);
      });
    });

    return bounds;
  }
}
