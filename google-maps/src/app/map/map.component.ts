import { AfterViewInit, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { GoogleMap, MapInfoWindow, MapMarker } from '@angular/google-maps';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, AfterViewInit {
 // TEST VARIABLE

  @ViewChild(MapInfoWindow) private infoWindow!: MapInfoWindow;
  @ViewChild(GoogleMap, { static: false }) map!: GoogleMap;

  //#region Options
  public mapOptions!: google.maps.MapOptions;
  public polygonOptions!: google.maps.PolygonOptions;

  //#endregion Map Options

  public vertices: google.maps.LatLngLiteral[] = [];
  public searchArea: google.maps.LatLngLiteral[] = [];


  markers: any[] = [];

  public showSearchPolygon: boolean = true;
  public showSearchArea: boolean = false;

  public selectedPlace: any = null;

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
  // public isPanelHidden: boolean = false;

  // toggleSidebar() {
  //   this.isPanelHidden = !this.isPanelHidden;
  // }

  isDropdownFilter: boolean = false;
  isDropdownOptions: boolean = false;

  public toggleDropdownFilter(): void {
    this.isDropdownFilter = !this.isDropdownFilter;
    this.isDropdownOptions = false;
  }

  public toggleDropdownOptions(): void {
    this.isDropdownOptions = !this.isDropdownOptions;
    this.isDropdownFilter = false;
  }

  constructor(private cdr: ChangeDetectorRef) {

  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.initializeDependency();
    this.initializeMap();
    this.loadRestaurantData();
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

    this.polygonOptions = {
      strokeColor: '#ED433B',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#062E71',
      fillOpacity: 0.25,
    };
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

  private loadRestaurantData(): void {
    // Polygon coordinates that covers whole cebu area
    this.searchArea = [
      { lat: 9.384260, lng: 123.265764 },
      { lat: 11.379277, lng: 123.247782 },
      { lat: 11.418057, lng: 124.161251},
      { lat: 9.352847, lng: 124.141142 }
    ];

    // Create a LatLngBounds object from the polygon coordinates
    const bounds = new google.maps.LatLngBounds();
    this.searchArea.forEach((point: any) => bounds.extend(point));

    // Perform a search within the polygon bounds
    const request: google.maps.places.TextSearchRequest = {
      bounds: bounds,
      query: 'cebu restaurants',
      type: "restaurant"
    };

    this.placeService.textSearch(request, (results, status, pagination) => {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        // Process the search results here
        console.log(results);
        this.searchResults = <google.maps.places.PlaceResult[]>results;
        this.plotMarker(results, pagination);
      }
    });
    this.cdr.detectChanges();
  }

  plotMarker(results: any, pagination?: any) {
    if(results.length > 0) {
      // Fit the map bounds to the markers
      const bounds = new google.maps.LatLngBounds();
      for (const place of results) {
        bounds.extend(place.geometry?.location);
        // Process each restaurant place
        console.log(place.name, place.formatted_address);
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
      this.vertices = this.convertBoundsToLiteral(bounds);
    }
    else {
      this.vertices = [];
      this.map.panTo({ lat: 10.3157, lng: 123.8854 }); // Replace with desired center coordinates
    }
    // if (pagination && pagination.hasNextPage) {
    //   // If there is a next page, retrieve the next page of results
    //   pagination.nextPage();
    // }

    this.cdr.detectChanges();

  }

  openInfoWindow(marker: MapMarker, markerItem: any) {
    if (this.infoWindow != undefined) {
    // Define the request for place details
      const request = {
        placeId: markerItem.placeId,
      };

      // Call the PlacesService getDetails method
      this.placeService.getDetails(request, (placeDetails, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          // Check if the cuisine information is available
          // if (place?.cuisine) {
          //   console.log(place.cuisine); // Print the cuisine information
          // } else {
          //   console.log('Cuisine information not available.');
          // }
          console.log(placeDetails);
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
        const currentLat = position.coords.latitude;
        const currentLng = position.coords.longitude;

        const request = {
          origin: { lat: currentLat, lng: currentLng },
          destination: { lat: this.selectedPlace.geometry.location.toJSON().lat, lng: this.selectedPlace.geometry.location.toJSON().lng },
          travelMode: google.maps.TravelMode.DRIVING, // Adjust the travel mode as needed
        };

        this.directionsService.route(request, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK) {
            this.directionsRenderer.setDirections(result);

            // Gradually zoom out after setting directions
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
            }, 100); // Adjust the interval duration as needed
          }
        });
      },
      (error) => {
        // Handle error cases
        console.log(error);
      }
    );
  }
}
