import fs from 'fs';
import path from 'path';
import noop from 'lodash/noop';

import { applyBpsPatch } from './bps';

function loadFixture(filename) {
  return fs.readFileSync(path.join(__dirname, '../__fixtures__', filename));
}

describe('applyBpsPatch', () => {
  const testCases = [
    ['smiley-x.txt', 'smiley-to-frowny-x.bps', 'frowny-x.txt'],
  ];
  it('applies an IPS patch', () => {
    testCases.forEach(([source, patch, result]) => {
      const dataActual = applyBpsPatch(loadFixture(source), loadFixture(patch), { log: noop });
      const dataExpected = loadFixture(result);
      expect(dataActual).toEqual(dataExpected);
    });
  });
});
