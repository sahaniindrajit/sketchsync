import { v4 as uuidv4 } from 'uuid';
import { maxZ } from '@/shared/ops';
import { DEFAULTS, type Shape } from '@/shared/protocol';
import { useBoard } from './store';

type NewShape<T extends Shape> = Omit<T, 'id' | 'z' | 'updatedAt' | 'createdBy' | 'rotation' | 'opacity' | 'strokeColor' | 'strokeWidth' | 'fillColor'> &
    Partial<Pick<T, 'strokeColor' | 'strokeWidth' | 'fillColor' | 'rotation' | 'opacity'>>;

/** Builds a complete shape with ids, z-order and the current style defaults. */
export function makeShape<T extends Shape>(partial: NewShape<T>, clientId = 'local'): T {
    const state = useBoard.getState();
    return {
        id: uuidv4(),
        z: maxZ(state.shapes.values()) + 1,
        updatedAt: Date.now(),
        createdBy: `user:${clientId}`,
        rotation: 0,
        opacity: DEFAULTS.opacity,
        strokeColor: state.strokeColor,
        strokeWidth: state.strokeWidth,
        fillColor: state.fillColor,
        ...partial,
    } as T;
}

const MAX_IMAGE_BYTES = 950 * 1024;
const MAX_IMAGE_DIMENSION = 1600;

/** Reads an image file into a data URL that fits the server's 1 MB limit. */
export async function fileToImageData(file: File): Promise<{ src: string; width: number; height: number }> {
    const url = URL.createObjectURL(file);
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error('Could not read that image'));
            el.src = url;
        });
        let scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
        for (let attempt = 0; attempt < 6; attempt++) {
            const width = Math.max(1, Math.round(img.naturalWidth * scale));
            const height = Math.max(1, Math.round(img.naturalHeight * scale));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d')!;
            const keepAlpha = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif';
            if (!keepAlpha) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
            }
            ctx.drawImage(img, 0, 0, width, height);
            const src = keepAlpha ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85);
            const bytes = Math.ceil((src.length - src.indexOf(',') - 1) * 0.75);
            if (bytes <= MAX_IMAGE_BYTES) return { src, width: img.naturalWidth, height: img.naturalHeight };
            // Too large: try JPEG (if possible) and a smaller size.
            const jpeg = canvas.toDataURL('image/jpeg', 0.8);
            if (Math.ceil((jpeg.length - jpeg.indexOf(',') - 1) * 0.75) <= MAX_IMAGE_BYTES && !keepAlpha) {
                return { src: jpeg, width: img.naturalWidth, height: img.naturalHeight };
            }
            scale *= 0.7;
        }
        throw new Error('That image is too large (limit is about 1 MB after compression)');
    } finally {
        URL.revokeObjectURL(url);
    }
}
