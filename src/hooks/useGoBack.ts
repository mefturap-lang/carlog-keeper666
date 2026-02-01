import { useNavigate } from "react-router-dom";
import { useCallback } from "react";

/**
 * A hook that provides a goBack function.
 * Uses browser history to go back to the previous page.
 * Falls back to the provided route if no history exists.
 */
export const useGoBack = (fallback: string = "/") => {
  const navigate = useNavigate();

  const goBack = useCallback(() => {
    // Check if we have history to go back to
    // window.history.state?.idx > 0 indicates we have navigated within the app
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      // No history, use fallback
      navigate(fallback, { replace: true });
    }
  }, [navigate, fallback]);

  return goBack;
};
