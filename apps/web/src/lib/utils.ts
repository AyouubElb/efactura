import { createCn } from 'cn/config';

// Teaches the class merger the theme's own sizes and shadows, so text-label never reads as a colour
export const cn = createCn({
  extend: {
    classGroups: {
      'font-size': [{ text: ['title', 'subtitle', 'label', 'caps', 'stamp'] }],
      shadow: [{ shadow: ['ink-2', 'ink-3', 'ink-4'] }],
    },
  },
});
