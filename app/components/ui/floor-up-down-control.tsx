import { Map, NavigationControl } from "maplibre-gl";
import { useEffect } from "react";
import useFloorStore from "~/stores/floor-store";
import IndoorMapLayer from "~/layers/indoor-map-layer";

interface FloorUpDownControlProps {
  map: Map;
  indoorMapLayer: IndoorMapLayer;
}

export function FloorUpDownControl({
  map,
  indoorMapLayer,
}: FloorUpDownControlProps) {
  const { currentFloor, setCurrentFloor } = useFloorStore();

  useEffect(() => {
    const floorControl = new NavigationControl({
      showCompass: false,
      showZoom: false,
      visualizePitch: false,
    });

    map.addControl(floorControl, "bottom-right");

    const upButton = document.createElement("button");
    upButton.className = "maplibregl-ctrl-icon maplibregl-ctrl-floor-up";
    upButton.innerHTML = "&#8593;"; // Up arrow
    upButton.addEventListener("click", () => {
      const nextFloor = currentFloor + 1;
      if (nextFloor <= 2) {
        setCurrentFloor(nextFloor);
        indoorMapLayer.setFloorLevel(nextFloor);
      }
    });

    const downButton = document.createElement("button");
    downButton.className = "maplibregl-ctrl-icon maplibregl-ctrl-floor-down";
    downButton.innerHTML = "&#8595;"; // Down arrow
    downButton.addEventListener("click", () => {
      //const nextFloor = currentFloor - 1;
      setCurrentFloor(0);
      indoorMapLayer.setFloorLevel(0);
    });

    floorControl._container.append(upButton);
    floorControl._container.append(downButton);

    return () => {
      map.removeControl(floorControl);
    };
  }, [map, currentFloor, setCurrentFloor, indoorMapLayer]);

  return null;
}
