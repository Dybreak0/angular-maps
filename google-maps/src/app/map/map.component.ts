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

  //#region Map Options
  public mapOptions!: google.maps.MapOptions;
  //#endregion Map Options

  public vertices: google.maps.LatLngLiteral[] = [];


  markers: any[] = [];

  public show: boolean = true;

  public selectedPlace: any = null;

  // List of available restaurant types
  public restaurantTypes: Array<any> = [
    {
      type: "restaurant",
      checked: false
    },
    {
      type: "cafe",
      checked: false
    },
    {
      type: "bar",
      checked: false
    },
    {
      type: "bakery",
      checked: false
    },
    {
      type: "meal_delivery",
      checked: false
    },
    {
      type: "meal_takeaway",
      checked: false
    },
    {
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
      mapTypeId: 'hybrid',
      disableDoubleClickZoom: true,
    }

    // polygonOptions = {
    //   strokeColor: '#ff0000',
    //   strokeOpacity: 0.8,
    //   strokeWeight: 2,
    //   fillColor: '#00ff00',
    //   fillOpacity: 0.4,
    // };
  }

  private initializeDependency(): void {
    this.directionsService = new google.maps.DirectionsService();
    this.directionsRenderer = new google.maps.DirectionsRenderer({ map: <google.maps.Map>this.map.googleMap });
    this.directionsRenderer.setOptions({
      polylineOptions: {
        strokeColor: '#B5121B', // set the color of the path (e.g., red)
        strokeOpacity: 0.8, // set the opacity of the path (0.0 to 1.0)
        strokeWeight: 8, // set the thickness of the path
      }
    });
  }

  private loadRestaurantData(): void {
    // Polygon coordinates that covers whole cebu area
    this.vertices = [
      { lat: 9.384260, lng: 123.265764 },
      { lat: 11.379277, lng: 123.247782 },
      { lat: 11.418057, lng: 124.161251},
      { lat: 9.352847, lng: 124.141142 }
    ];

    // Create a LatLngBounds object from the polygon coordinates
    const bounds = new google.maps.LatLngBounds();
    this.vertices.forEach((point: any) => bounds.extend(point));

    // Perform a search within the polygon bounds
    const request: google.maps.places.TextSearchRequest = {
      bounds: bounds,
      query: 'cebu restaurants',
      type: "restaurant"
    };

    var service = new google.maps.places.PlacesService(<google.maps.Map>this.map.googleMap);

    service.textSearch(request, (results, status, pagination) => {
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
    // Fit the map bounds to the markers
    const bounds = new google.maps.LatLngBounds();
    for (const place of results) {
      bounds.extend(place.geometry?.location);
      // Process each restaurant place
      console.log(place.name, place.formatted_address);
      var coord: any = place?.geometry?.location?.toJSON();
      if (coord != null)  {
        this.markers.push({
          position: place.geometry?.location,
          label: {
            color: 'red',
            text: place.formatted_address,
          },
          title: place.name,
          info: 'Marker info ' + (this.markers.length + 1),
          options: {
            animation: google.maps.Animation.DROP,
          },
        });
      }
    }
    this.map.fitBounds(bounds);
    this.vertices = this.convertBoundsToLiteral(bounds);

    this.cdr.detectChanges();

    if (pagination && pagination.hasNextPage) {
      // If there is a next page, retrieve the next page of results
      pagination.nextPage();
    }
  }

  openInfoWindow(marker: MapMarker, markerItem: any) {
    this.selectedPlace = markerItem;
    if (this.infoWindow != undefined) this.infoWindow.open(marker);

    this.getDirections();
  }

  public updateMarkers(): void {
    this.selectedTypes = this.restaurantTypes.filter(item => item.checked).map(type => type.type);
    this.filteredResults = this.searchResults.filter((place) => {
      // Filter results based on selected types
      return place.types?.some((type) => this.selectedTypes.includes(type));
    });

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
          destination: { lat: this.selectedPlace.position.toJSON().lat, lng: this.selectedPlace.position.toJSON().lng },
          travelMode: google.maps.TravelMode.DRIVING, // Adjust the travel mode as needed
        };

        this.directionsService.route(request, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK) {
            this.directionsRenderer.setDirections(result);
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
