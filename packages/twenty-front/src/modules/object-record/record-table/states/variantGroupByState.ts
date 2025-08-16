import { atom } from 'recoil';

export const variantGroupByState = atom<string | null>({
  key: 'variantGroupByState',
  default: null,
});
