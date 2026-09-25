import ClassicTemplate from '@/templates/ClassicTemplate';

/**
 * Template key -> preview component.
 *
 * The keys mirror the backend registry (enum CvTemplate, served by
 * GET /api/templates). The server is the authority on which keys exist - it
 * rejects anything else with a 400 - so the picker lists what the API returns,
 * and this map only decides how each one is drawn. A key the server knows but
 * this build has no component for falls back to Classic rather than a blank
 * preview.
 */
export const DEFAULT_TEMPLATE_KEY = 'classic';

const TEMPLATE_COMPONENTS = {
  classic: ClassicTemplate,
};

export function templateComponent(key) {
  return TEMPLATE_COMPONENTS[key] ?? TEMPLATE_COMPONENTS[DEFAULT_TEMPLATE_KEY];
}

/** Display name from a fetched template list, falling back to the raw key. */
export function templateName(templates, key) {
  return templates.find((template) => template.key === key)?.name ?? key;
}
