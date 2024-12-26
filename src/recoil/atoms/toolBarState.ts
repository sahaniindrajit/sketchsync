import { atom } from 'recoil';

export const activeToolState = atom<string>({
    key: 'activeToolState',
    default: 'pencil',
});

export const strokeColorState = atom<string>({
    key: 'strokeColorState',
    default: '#000000',
});

export const strokeWidthState = atom<number>({
    key: 'strokeWidthState',
    default: 2,
});
