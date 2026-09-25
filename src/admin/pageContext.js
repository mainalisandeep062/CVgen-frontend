import { createContext, useContext, useEffect } from 'react';

/**
 * Lets an admin page put its title (and an optional subtitle) into the layout's
 * top bar without the layout knowing about every route.
 */
export const AdminPageContext = createContext({ setPage: () => {} });

export function usePageTitle(title, subtitle = '') {
  const { setPage } = useContext(AdminPageContext);
  useEffect(() => {
    setPage({ title, subtitle });
  }, [title, subtitle, setPage]);
}
