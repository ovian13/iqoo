import { test } from 'node:test';
import { rejects } from 'node:assert/strict';
import { fetchRepoCode } from './github-code-fetcher';

test('fetchRepoCode throws on invalid GitHub URL', async () => {
  await rejects(
    async () => await fetchRepoCode('https://gitlab.com/owner/repo'),
    new Error('Invalid GitHub URL')
  );

  await rejects(
    async () => await fetchRepoCode('just-some-string'),
    new Error('Invalid GitHub URL')
  );
});
