import * as React from 'react';

interface PageMetaProps {
  title: string;
  description?: string;
}

export default function PageMeta({ title, description }: PageMetaProps) {
  React.useEffect(() => {
    document.title = title ? `${title} | S.S.T POS` : 'S.S.T POS - Sanyali School of Technology';
    if (description) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute('content', description);
      }
    }
  }, [title, description]);

  return null;
}
