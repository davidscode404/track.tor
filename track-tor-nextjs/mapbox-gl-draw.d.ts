declare module "@mapbox/mapbox-gl-draw" {
  import type { FeatureCollection } from "geojson";
  import type mapboxgl from "mapbox-gl";

  interface DrawOptions {
    displayControlsDefault?: boolean;
    controls?: {
      polygon?: boolean;
      trash?: boolean;
      line_string?: boolean;
      point?: boolean;
      combine_features?: boolean;
      uncombine_features?: boolean;
    };
    defaultMode?: string;
  }

  class MapboxDraw {
    constructor(options?: DrawOptions);
    add(geojson: FeatureCollection): string[];
    delete(ids: string[]): this;
    deleteAll(): this;
    getAll(): FeatureCollection;
    getSelectedIds(): string[];
    getSelected(): FeatureCollection;
    getSelectedPoints(): FeatureCollection;
    setFeatureProperty(id: string, property: string, value: unknown): this;
    set(featureCollection: FeatureCollection): this;
  }

  export default MapboxDraw;
}
