export type Shape = {
    id: string;
    x?: number;
    y?: number;
};

export type Rectangle = Shape & {
    width: number;
    height: number;
    color: { fillColor: string };
    strokeWidth: { strokeWidth: number }
    strokeColor: { strokeColor: string }
    x: number;
    y: number;
};

export type Circle = Shape & {
    radius: number;
    color: { fillColor: string };
    strokeWidth: { strokeWidth: number }
    strokeColor: { strokeColor: string }
    x: number;
    y: number;
};

export type Scribble = Shape & {
    points: number[];
    strokeWidth: { strokeWidth: number }
    strokeColor: { strokeColor: string }
};

export type Arrow = Shape & {
    points: [number, number, number, number];
    strokeWidth: { strokeWidth: number }
    strokeColor: { strokeColor: string }
    color: { fillColor: string };
};