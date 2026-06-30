import { describe, it, expect, vi } from 'vitest';
import {
  STAC_URL_PARAM,
  getStacUrlValue,
  maybeHandleDeepLink,
} from '../src/lib/utils/deep-link';

const params = (search: string) => new URLSearchParams(search);

describe('getStacUrlValue', () => {
  it('returns the value when the parameter is present', () => {
    expect(
      getStacUrlValue(params('?stac=https://earth-search.aws.element84.com/v1')),
    ).toBe('https://earth-search.aws.element84.com/v1');
  });

  it('percent-decodes the value', () => {
    expect(getStacUrlValue(params('stac=https%3A%2F%2Fx%2Fcatalog.json'))).toBe(
      'https://x/catalog.json',
    );
  });

  it('ignores other parameters', () => {
    expect(getStacUrlValue(params('a=1&stac=https://x/catalog.json&b=2'))).toBe(
      'https://x/catalog.json',
    );
  });

  it('returns null when the parameter is absent', () => {
    expect(getStacUrlValue(params('?foo=bar'))).toBeNull();
    expect(getStacUrlValue(params(''))).toBeNull();
  });

  it('returns null when the parameter is blank or whitespace', () => {
    expect(getStacUrlValue(params('?stac='))).toBeNull();
    expect(getStacUrlValue(params('?stac=%20%20'))).toBeNull();
  });

  it('exposes the parameter name', () => {
    expect(STAC_URL_PARAM).toBe('stac');
  });
});

describe('maybeHandleDeepLink', () => {
  it('forwards the value when the parameter is present', async () => {
    const consumer = { loadCatalog: vi.fn() };
    await maybeHandleDeepLink(consumer, params('?stac=https://x/catalog.json'));
    expect(consumer.loadCatalog).toHaveBeenCalledOnce();
    expect(consumer.loadCatalog).toHaveBeenCalledWith('https://x/catalog.json');
  });

  it('does nothing when the parameter is absent or blank', async () => {
    const consumer = { loadCatalog: vi.fn() };
    await maybeHandleDeepLink(consumer, params('?other=1'));
    await maybeHandleDeepLink(consumer, params('?stac='));
    expect(consumer.loadCatalog).not.toHaveBeenCalled();
  });
});
