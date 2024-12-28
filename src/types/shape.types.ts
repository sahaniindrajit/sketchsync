export type Shape = {
    id: string;
    color: { fillColor: string };
    x?: number;
    y?: number;
};

export type Rectangle = Shape & {
    width: number;
    height: number;
    strokeWidth: { strokeWidth: number }
    strokeColor: { strokeColor: string }
    x: number;
    y: number;
};

export type Circle = Shape & {
    radius: number;
    strokeWidth: { strokeWidth: number }
    strokeColor: { strokeColor: string }
    x: number;
    y: number;
};

export type Scribble = Shape & {
    points: number[];
};

export type Arrow = Shape & {
    points: [number, number, number, number];
    strokeWidth: { strokeWidth: number }
    strokeColor: { strokeColor: string }
};