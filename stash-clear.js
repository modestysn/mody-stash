// use isomorphic-git API to clone a github repository
import * as isogit from 'isomorphic-git';
import fs from 'fs';

const dir = './sandbox';

async function stash_clear() {
    try {
		// remove the stash reflog file first
		await fs.promises.unlink(`${dir}/.git/logs/refs/stash`);
		// remove the stash ref
		await isogit.deleteRef({
			fs,
			dir,
			ref: 'refs/stash' });

    } catch (e) {
        console.error(e);
    }
}

stash_clear();