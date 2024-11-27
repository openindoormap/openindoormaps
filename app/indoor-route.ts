//TODO: Consider using a graph library like graphlib or js-graph-algorithms for more advanced graph operations
import maplibregl from "maplibre-gl";

type Node = string;
type Edge = { to: Node; weight: number };

class Graph {
  adjacencyList: Map<Node, Edge[]> = new Map();

  addNode(node: Node) {
    if (!this.adjacencyList.has(node)) {
      this.adjacencyList.set(node, []);
    }
  }

  addEdge(from: Node, to: Node, weight: number) {
    this.addNode(from);
    this.addNode(to);
    this.adjacencyList.get(from)?.push({ to, weight });
    this.adjacencyList.get(to)?.push({ to: from, weight });
  }

  getNodes() {
    return [...this.adjacencyList.keys()];
  }

  getEdges(node: Node): Edge[] {
    return this.adjacencyList.get(node) || [];
  }
}

export default class IndoorRoute {
  private map: maplibregl.Map;
  private graph: Graph;

  constructor(map: maplibregl.Map) {
    this.map = map;
    this.graph = new Graph();
  }

  public async loadGeoJson(url: string, showDebugLayers: boolean) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load GeoJSON: ${response.statusText}`);
      }
      const geoJsonData: GeoJSON.FeatureCollection = await response.json();
      this.parseGeoJsonToGraph(geoJsonData);

      if (showDebugLayers) {
        this.map.addSource("indoor-route", {
          type: "geojson",
          data: geoJsonData,
        });

        this.map.addLayer({
          id: "indoor-route-line",
          type: "line",
          source: "indoor-route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#007aff",
            "line-width": 4,
          },
        });

        this.map.addLayer({
          id: "indoor-route-points",
          type: "circle",
          source: "indoor-route",
          paint: {
            "circle-radius": 6,
            "circle-color": "#ff5722",
          },
        });

        this.map.addLayer({
          id: "crossings-layer",
          type: "circle",
          source: "indoor-route",
          filter: ["==", ["get", "type"], "crossing"],
          paint: {
            "circle-radius": 8,
            "circle-color": "#007aff",
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
        });
      }
    } catch (error) {
      console.error("Error loading GeoJSON data:", error);
    }
  }

  private parseGeoJsonToGraph(geoJson: GeoJSON.FeatureCollection) {
    const coordMap = new Map<string, Set<GeoJSON.Position[]>>();

    geoJson.features.forEach((feature) => {
      if (feature.geometry.type === "LineString" && feature.properties) {
        const coordinates = feature.geometry.coordinates;

        coordinates.forEach((coord) => {
          const key = JSON.stringify(coord);
          if (!coordMap.has(key)) {
            coordMap.set(key, new Set());
          }
          coordMap.get(key)?.add(coordinates);
        });
      }
    });

    geoJson.features.forEach((feature) => {
      if (feature.geometry.type === "LineString" && feature.properties) {
        const coordinates = feature.geometry.coordinates;
        const weight = feature.properties.weight || 1;

        for (let i = 0; i < coordinates.length - 1; i++) {
          const from = JSON.stringify(coordinates[i]);
          const to = JSON.stringify(coordinates[i + 1]);

          this.graph.addEdge(from, to, weight);

          const fromOverlaps = coordMap.get(from);

          if (fromOverlaps && fromOverlaps.size > 1) {
            fromOverlaps.forEach((otherCoords) => {
              if (otherCoords == coordinates) {
                const idx = otherCoords.findIndex(
                  (c) => JSON.stringify(c) === from,
                );
                if (idx !== -1) {
                  if (idx > 0) {
                    this.graph.addEdge(
                      from,
                      JSON.stringify(otherCoords[idx - 1]),
                      weight,
                    );
                  }
                  if (idx < otherCoords.length - 1) {
                    this.graph.addEdge(
                      from,
                      JSON.stringify(otherCoords[idx + 1]),
                      weight,
                    );
                  }
                }
              }
            });
          }
        }
      }
    });
  }

  public findShortestPath(start: number[], end: number[]): number[][] {
    const startNode = JSON.stringify(start);
    const endNode = JSON.stringify(end);

    const path = this.dijkstra(startNode, endNode);
    return path.map((node) => JSON.parse(node));
  }

  private dijkstra(start: Node, end: Node): Node[] {
    const distances: Record<Node, number> = {};
    const previous: Record<Node, Node | null> = {};
    const queue: Node[] = this.graph.getNodes();

    this.graph.getNodes().forEach((node) => {
      distances[node] = Infinity;
      // eslint-disable-next-line unicorn/no-null
      previous[node] = null;
    });
    distances[start] = 0;

    while (queue.length > 0) {
      const current = queue
        .sort((a, b) => distances[a] - distances[b])
        .shift()!;
      if (current === end) break;

      this.graph.getEdges(current).forEach(({ to, weight }) => {
        const alt = distances[current] + weight;
        if (alt < distances[to]) {
          distances[to] = alt;
          previous[to] = current;
        }
      });
    }

    const path: Node[] = [];
    let current: Node | null = end;
    while (current) {
      path.unshift(current);
      current = previous[current];
    }

    return path[0] === start ? path : [];
  }

  public visualizePath(path: number[][]) {
    const geoJsonPath: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: path,
          },
          properties: {},
        },
      ],
    };

    if (this.map.getSource("shortest-path")) {
      (this.map.getSource("shortest-path") as maplibregl.GeoJSONSource).setData(
        geoJsonPath,
      );
    } else {
      this.map.addSource("shortest-path", {
        type: "geojson",
        data: geoJsonPath,
      });

      this.map.addLayer({
        id: "shortest-path-layer",
        type: "line",
        source: "shortest-path",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#ff0000", "line-width": 4 },
      });
    }
  }
}
