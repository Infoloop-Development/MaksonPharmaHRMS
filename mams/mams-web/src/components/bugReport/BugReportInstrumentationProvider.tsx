import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  clickLabelFromElement,
  formSubmitLabel,
  pushBreadcrumb,
} from '../../lib/bugReport';

export function BugReportInstrumentationProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    pushBreadcrumb(`route:${location.pathname}`);
  }, [location.pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const interactive = target.closest('button,a,[role="button"]');
      if (!interactive) return;
      const label = clickLabelFromElement(interactive);
      if (label) pushBreadcrumb(`click:${label}`);
    };

    const onSubmit = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLFormElement)) return;
      pushBreadcrumb(`submit:${formSubmitLabel(target)}`);
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, []);

  return <>{children}</>;
}
