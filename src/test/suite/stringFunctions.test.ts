import * as assert from 'assert';
import { suite, test } from 'mocha';

import { StringFunctions } from '../../additional/stringFunctions';

suite("StringFunctions Tests", () => {
    test("replaceAll", () => {
        assert.equal(StringFunctions.replaceAll('Remove all "double" quotes" from this " text.', '"', ''), 'Remove all double quotes from this  text.');
    });

    // TODO Test escapeRegExp
});