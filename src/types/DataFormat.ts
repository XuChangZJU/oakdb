export type geoType = 'Point' | 'LineString' | 'MultiPoint' | 'MultiLineString' | 'Polygon' | 'MultiPolygon' | 'GeometryCollection';
export type geo = {
    type: geoType;
    coordinates: number[] | number[][] | number[][][] | geo[];
};

export type json = object;
export type date = number;
export type time = number;
