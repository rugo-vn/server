import { expect } from 'chai';
import { secureJoin } from '../src/path.js';

describe('Path test', function () {
  it('should secure join', async () => {
    expect(secureJoin('/abc/def', '../xxx', 'ghi', '../lm')).to.be.eq(
      '/abc/def/xxx/ghi/lm'
    );
  });
});
