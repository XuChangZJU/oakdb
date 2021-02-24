export declare type geoType = 'Point' | 'LineString' | 'MultiPoint' | 'MultiLineString' | 'Polygon' | 'MultiPolygon' | 'GeometryCollection';
export declare type geo = {
    type: geoType;
    coordinates: number[] | number[][] | number[][][] | geo[];
};
export declare type json = object;
export declare type date = number;
export declare type time = number;
