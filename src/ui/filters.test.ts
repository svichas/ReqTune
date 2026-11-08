import { describe, expect, it } from 'vitest';
import { REQUEST_METHODS, RESOURCE_TYPES, filterSummary, labelsFor, valuesFor } from './filters';

describe('filterSummary', () => {
  it.each([
    [{}, ''],
    [{ resourceTypes: [], requestMethods: [] }, ''],
    [{ resourceTypes: ['xmlhttprequest'], requestMethods: ['post'] }, 'Fetch/XHR · POST'],
    [{ resourceTypes: ['script', 'main_frame'] }, 'Page loads, Scripts'],
    [{ requestMethods: ['put', 'get'] }, 'GET, PUT'],
    [{ resourceTypes: ['ping'], requestMethods: ['connect'] }, 'Other · Other methods'],
    [{ requestMethods: ['connect'] }, 'Other methods'],
  ])('%j reads %j', (filters, summary) => expect(filterSummary(filters)).toBe(summary));
});

describe('labelsFor and valuesFor', () => {
  it("pick each label's Chrome values, in the options' order", () => {
    expect(valuesFor(RESOURCE_TYPES, ['Other', 'Fetch/XHR'])).toEqual([
      'xmlhttprequest',
      'other',
      'object',
      'ping',
      'csp_report',
      'webtransport',
      'webbundle',
    ]);
    expect(valuesFor(REQUEST_METHODS, [])).toEqual([]);
  });

  it('read back the labels they were given', () => {
    for (const options of [RESOURCE_TYPES, REQUEST_METHODS]) {
      const labels = Object.keys(options);
      expect(labelsFor(options, valuesFor(options, labels))).toEqual(labels);
      for (const label of labels) expect(labelsFor(options, valuesFor(options, [label]))).toEqual([label]);
    }
  });
});
