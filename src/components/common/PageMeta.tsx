import * as React from 'react';

interface PageMetaProps {
  title: string;
  description?: string;
}

export default function PageMeta({ title, description }: PageMetaProps) {
  React.useEffect(() => {
    document.title = title ? `${title} | S.S.T POS SYSTEM` : 'S.S.T POS SYSTEM - Sanyali School Of Technology Pos System';
    if (description) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute('content', description);
      }
    }
  }, [title, description]);

  return null;
}
