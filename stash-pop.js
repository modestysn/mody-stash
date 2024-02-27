// use isomorphic-git API to clone a github repository
import * as isogit from 'isomorphic-git';
import fs from 'fs';
import {stash_apply} from './stash-apply.js';
import {stash_drop} from './stash-drop.js';

const dir = './sandbox';

async function stash_pop() {
    try {
		// read from reflog and get the last stash commit
		let stashRef = await isogit.resolveRef({fs, dir, ref: 'stash'});
		if (!stashRef) {
			console.info('no stash entry, nothing to pop');
			return;
		}

		const applyStash = await stash_apply();
		const droppedStash = await stash_drop();

		console.info('stash pop: applyStash - droppedStash', applyStash, droppedStash);

    } catch (e) {
        console.error(e);
    }
}

stash_pop();