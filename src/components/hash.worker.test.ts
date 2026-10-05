import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';

// The worker talks to `self`; capture its output in Node.
const messages: any[] = [];
(globalThis as any).self = globalThis;
(globalThis as any).postMessage = (m: any) => messages.push(m);

beforeAll(async () => {
  await import('./hash.worker');
});

async function hash(file: File) {
  messages.length = 0;
  await (self as any).onmessage({ data: { files: [file] } });
  const done = messages.find((m) => m.type === 'HASH_COMPLETE');
  expect(done.result.hashingStatus).toBe('completed');
  return done.result as { sha256: string; md5: string };
}

const ref = (b: Uint8Array, alg: string) => createHash(alg).update(b).digest('hex');

describe('hash.worker', () => {
  it('empty input', async () => {
    const r = await hash(new File([], 'empty'));
    expect(r.sha256).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(r.md5).toBe('d41d8cd98f00b204e9800998ecf8427e');
  });

  it('"abc"', async () => {
    const r = await hash(new File(['abc'], 'abc'));
    expect(r.sha256).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(r.md5).toBe('900150983cd24fb0d6963f7d28e17f72');
  });

  it('one million "a" (NIST vector, streamed)', async () => {
    const r = await hash(new File([new Uint8Array(1_000_000).fill(0x61)], 'a'));
    expect(r.sha256).toBe('cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0');
    expect(r.md5).toBe('7707d6ae4e027c70eea2a935c2296f21');
  });

  it('5 MB file via 2 MB slice fallback (multi-chunk)', async () => {
    const bytes = new Uint8Array(5 * 1024 * 1024 + 123).map((_, i) => (i * 31 + 7) & 0xff);
    const file = new File([bytes], 'big');
    Object.defineProperty(file, 'stream', { value: undefined });
    const r = await hash(file);
    expect(r.sha256).toBe(ref(bytes, 'sha256'));
    expect(r.md5).toBe(ref(bytes, 'md5'));
  });
});
