import { expect, test } from 'vitest';
import { BASE, assertAllowed } from '../../scripts/lib/site.ts';

// 会改动网站数据的请求必须被拒绝（只允许 GET 和 POST 到确认页）
test.each([
  ['GET', '/events/add', true],
  ['GET', 'https://eventernote.s3.amazonaws.com/images/events/1_s.jpg', true],
  ['POST', '/events/add/confirm', true],
  ['POST', '/events/add/complete', false],
  ['POST', '/events/494909/edit/complete', false],
  ['POST', '/api/notes/add', false],
  ['DELETE', '/events/494909', false],
  ['POST', 'https://example.com/events/add/confirm', false],
])('%s %s → %s', (method, path, allowed) => {
  const check = () => assertAllowed(method, new URL(path, BASE));
  if (allowed) expect(check).not.toThrow();
  else expect(check).toThrow(/禁止的请求/);
});
