import { useCallback, useEffect, useRef, useState } from 'react';
import { mensajeError } from '../api/http.js';

/**
 * Carga datos al montar y cada vez que cambian las dependencias.
 * fetcher: () => Promise<datos>.   Devuelve { data, loading, error, reload }.
 */
export default function useFetch(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const ref = useRef(fetcher);
  ref.current = fetcher;

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setError('');
    ref.current()
      .then((d) => { if (!cancelado) setData(d); })
      .catch((e) => { if (!cancelado) setError(mensajeError(e)); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, loading, error, reload };
}
