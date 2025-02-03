/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable unused-imports/no-unused-imports */
import MapLibreGlDirections, {
  LoadingIndicatorControl,
} from "@maplibre/maplibre-gl-directions";
import "@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css";
import { ArrowLeft, LucideProps, Search, SlidersVertical } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import config from "~/config";
import IndoorDirections from "~/indoor-directions/directions/main";
import building from "~/mock/building.json";
import useMapStore from "~/stores/use-map-store";

import { IndoorGeocoder, POIFeature } from "~/utils/indoor-geocoding";
import NavigationSettings from "../navigation-settings";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Toggle } from "../ui/toggle";
import topLocations from "~/mock/top-locations";
import DiscoveryView from "./discovery-view";
import { POI } from "~/types/poi";

type UIMode = "discovery" | "detail" | "routing";

export default function DiscoveryPanel() {
  const map = useMapStore((state) => state.mapInstance);
  const directions = useRef<MapLibreGlDirections>();
  const indoorDirections = useRef<IndoorDirections>();
  const [mode, setMode] = useState<UIMode>("discovery");
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);

  const [departure, setDeparture] = useState("");
  const [destination, setDestination] = useState("");

  const indoorGeocoder = useMemo(() => {
    return new IndoorGeocoder(building.pois.features as POIFeature[]);
  }, []);

  map?.on("load", () => {
    directions.current = new MapLibreGlDirections(map, {
      api: config.routingApi,
      requestOptions: {
        overview: "full",
        steps: "true",
      },
    });
    map?.addControl(new LoadingIndicatorControl(directions.current));

    indoorDirections.current = new IndoorDirections(map);
    indoorDirections.current.loadMapData(
      building.indoor_routes as GeoJSON.FeatureCollection,
    );
  });

  const handleRouting = async () => {
    console.log("Routing from", departure, "to", destination);
    if (!departure || !destination) return;
    const departureCoord = indoorGeocoder.indoorGeocodeInput(departure);
    const destinationCoord = indoorGeocoder.indoorGeocodeInput(destination);

    if (departureCoord && destinationCoord) {
      indoorDirections.current?.setWaypoints([
        departureCoord,
        destinationCoord,
      ]);
    }

    /*
    * Code for outdoor routing
    if (!departure || !destination) return;
    try {
      const [departureCoord, destinationCoord] = await Promise.all([
        geocodeInput(departure),
        geocodeInput(destination),
      ]);

      if (departureCoord && destinationCoord) {
        directions.current?.setWaypoints([departureCoord, destinationCoord]);

        if (map) {
          const bounds = new LngLatBounds();
          bounds.extend(departureCoord);
          bounds.extend(destinationCoord);

          map.fitBounds(bounds, {
            padding: 20,
          });
        }
      }
    } catch (error) {
      console.error("Error during routing:", error);
    }
      */
  };

  const handleSelectPOI = useCallback((poi: POI) => {
    setSelectedPOI(poi);
    console.log("Selected POI", poi);
    setMode("detail");
  }, []);

  return (
    <Card className="z-10 max-w-sm rounded-xl bg-white shadow-lg md:absolute md:left-4 md:top-4">
      {mode === "discovery" && (
        <DiscoveryView
          indoorGeocoder={indoorGeocoder}
          onSelectPOI={handleSelectPOI}
        />
      )}
    </Card>
  );
}
