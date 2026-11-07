import type { Group } from '../shared/types';

/**
 * Friendly labels for Chrome's declarativeNetRequest values; picking a label picks all of its values. "Other" also
 * takes Chrome's values too rare to list on their own, so picking every label leaves nothing out.
 */
export type FilterOptions = Record<string, string[]>;

export const RESOURCE_TYPES = {
  'Page loads': ['main_frame'],
  Frames: ['sub_frame'],
  'Fetch/XHR': ['xmlhttprequest'],
  Scripts: ['script'],
  Stylesheets: ['stylesheet'],
  Images: ['image'],
  Fonts: ['font'],
  Media: ['media'],
  WebSocket: ['websocket'],
  Other: ['other', 'object', 'ping', 'csp_report', 'webtransport', 'webbundle'],
} satisfies Record<string, `${chrome.declarativeNetRequest.ResourceType}`[]>;

export const REQUEST_METHODS = {
  GET: ['get'],
  POST: ['post'],
  PUT: ['put'],
  PATCH: ['patch'],
  DELETE: ['delete'],
  HEAD: ['head'],
  OPTIONS: ['options'],
  Other: ['other', 'connect'],
} satisfies Record<string, `${chrome.declarativeNetRequest.RequestMethod}`[]>;

/** The labels any of `values` belong to, in the options' order. */
export const labelsFor = (options: FilterOptions, values: string[] = []) =>
  Object.keys(options).filter((label) => options[label].some((value) => values.includes(value)));

/** Chrome's values for the picked labels, in the options' order. */
export const valuesFor = (options: FilterOptions, labels: string[]) =>
  Object.keys(options).flatMap((label) => (labels.includes(label) ? options[label] : []));

/** What a group's filters limit it to in one line, like 'Fetch/XHR · POST'; empty while it takes every request. */
export const filterSummary = ({ resourceTypes, requestMethods }: Pick<Group, 'resourceTypes' | 'requestMethods'>) =>
  [labelsFor(RESOURCE_TYPES, resourceTypes), labelsFor(REQUEST_METHODS, requestMethods)]
    .filter((labels) => labels.length)
    .map((labels) => labels.join(', '))
    .join(' · ');
