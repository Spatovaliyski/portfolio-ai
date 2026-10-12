import type { ContentBlock } from '../../../../domain/schema.ts';

export const newBlock = (type: ContentBlock['type']): ContentBlock => {
  const id = crypto.randomUUID();

  switch (type) {
    case 'prose':
      return { id, type, markdown: '' };
    case 'heading':
      return { id, type, text: '' };
    case 'image':
      return { id, type, mediaId: '', alt: '', caption: '' };
    case 'gallery':
      return { id, type, images: [{ mediaId: '', alt: '', caption: '' }] };
    case 'summary':
      return { id, type, title: '', ownership: '', constraints: '' };
    case 'decision':
      return { id, type, title: '', context: '', choice: '', alternatives: '', consequence: '' };
    case 'code':
      return { id, type, language: '', code: '', caption: '' };
    case 'diagram':
      return { id, type, title: '', nodes: ['Input', 'Output'], explanation: '' };
    case 'links':
      return { id, type, links: [] };
    case 'related':
      return { id, type, projectIds: [] };
    case 'metric':
      return {
        id,
        type,
        metric: {
          label: '',
          value: '',
          sourceUrl: 'https://',
          verifiedAt: new Date().toISOString().slice(0, 10),
          period: '',
          note: '',
        },
      };
  }
};
