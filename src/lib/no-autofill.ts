/**
 * Browser autofill suppression for fields that are NOT credentials or contact
 * data — search boxes, filters, endpoint URLs, custom labels.
 *
 * Why this is needed: Chrome and Edge ignore a bare autoComplete="off" on text
 * inputs and still offer saved form values based on heuristics (placeholder
 * text, label proximity, field order). Once a value is remembered, it drops
 * into the field on focus and the user cannot easily delete the suggestion —
 * which is exactly what breaks a search/filter box.
 *
 * What actually works, combined:
 *  - autoComplete="off" plus a NON-SEMANTIC name/id, so the browser has no
 *    known field type to map the input to and nothing to key saved values on.
 *  - autoCorrect / autoCapitalize / spellCheck off (mobile Safari + Chrome).
 *  - Vendor opt-outs, which password managers read instead of autoComplete:
 *      data-lpignore  -> LastPass
 *      data-1p-ignore -> 1Password
 *      data-bwignore  -> Bitwarden
 *      data-form-type -> Dashlane
 *
 * Do NOT use this on sign-in / register fields: autofilling an email and
 * password there is a feature, not a bug.
 */

/**
 * Non-semantic token mixed into every field name. Constant (not random) so the
 * server and client render identical HTML — Next.js would flag a hydration
 * mismatch otherwise. Randomness is not what defeats autofill; an opaque field
 * name with no recognizable type is.
 */
const AUTOFILL_TOKEN = "nf7f3a";

/** Browser + password-manager opt-out attributes shared by every field. */
export const AUTOFILL_OFF_ATTRS = {
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "off",
  spellCheck: false,
  "data-lpignore": "true",
  "data-1p-ignore": "",
  "data-bwignore": "true",
  "data-form-type": "other",
} as const;

/**
 * Props that suppress autofill for a non-credential field.
 * `slug` must be unique within the page (it becomes the field's id).
 */
export function noAutofillProps(slug: string) {
  return {
    ...AUTOFILL_OFF_ATTRS,
    name: `${slug}-${AUTOFILL_TOKEN}`,
    id: `${slug}-${AUTOFILL_TOKEN}`,
  };
}
