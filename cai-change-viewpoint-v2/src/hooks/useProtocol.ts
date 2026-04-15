import { useState, useEffect } from 'react';
import type { ViewType } from '../store/useAppStore';

const PROTOCOL_FILES: Record<ViewType, string> = {
  birdEye:   '/protocols/n09-protocol-bird-eye-view.md',
  eyeLevel:  '/protocols/n09-protocol-eye-level-view.md',
  front:     '/protocols/n09-protocol-front-view.md',
  rightSide: '/protocols/n09-protocol-side-view.md',
  top:       '/protocols/n09-protocol-top-view.md',
};

/** Extract the COMPLIANCE CHECK section from a protocol markdown string. */
export function extractComplianceCheck(protocolContent: string): string {
  const match = protocolContent.match(/# COMPLIANCE CHECK[\s\S]*/);
  return match ? match[0] : '';
}

interface UseProtocolResult {
  content: string | null;
  complianceCheck: string;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches the protocol markdown file for the given view type at runtime.
 * Returns the full content and the extracted COMPLIANCE CHECK section.
 */
export function useProtocol(viewType: ViewType | null): UseProtocolResult {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!viewType) {
      setContent(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(PROTOCOL_FILES[viewType])
      .then(res => {
        if (!res.ok) throw new Error(`Protocol fetch failed: ${res.status}`);
        return res.text();
      })
      .then(text => {
        if (!cancelled) {
          setContent(text);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [viewType]);

  return {
    content,
    complianceCheck: content ? extractComplianceCheck(content) : '',
    loading,
    error,
  };
}
