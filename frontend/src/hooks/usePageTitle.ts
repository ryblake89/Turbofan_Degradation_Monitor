import { useEffect } from "react";

const APP_NAME = "Turbofan Monitor";
const DEFAULT_TITLE = APP_NAME;

export function usePageTitle(page: string) {
  useEffect(() => {
    document.title = page ? `${page} — ${APP_NAME}` : DEFAULT_TITLE;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [page]);
}
