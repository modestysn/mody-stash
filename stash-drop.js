// use isomorphic-git API to clone a github repository
import * as isogit from 'isomorphic-git';
import fs from 'fs';
import {readAllReflogEntries} from './git-util.js';

const dir = './sandbox';

export async function stash_drop() {
    try {
		// read from reflog and get the last stash commit
		let stashRef = await isogit.resolveRef({fs, dir, ref: 'stash'});
		if (!stashRef) {
			console.info('no stash entry, nothing to drop');
			return;
		}

		// read from stash reflog and list the stash commits
		const reflogEntries = await readAllReflogEntries(dir, 'stash');
		console.info('reflogEntries:', reflogEntries);
		if (!reflogEntries.length) {
			console.info('no stash entry, nothing to drop');
			return;
		}
		// remove the last stash reflog entry from reflogEntries, then update the stash reflog
		const preLastStashEntry = reflogEntries.pop();
		const preLastStashSHA = preLastStashEntry.split(' ')[1];
		console.log('preLastStashSHA===stashRef', preLastStashSHA, stashRef);
		
		if (reflogEntries.length) {
			await fs.promises.writeFile(`${dir}/.git/logs/refs/stash`, reflogEntries.join('\n'));
			console.info('stash reflog updated:', reflogEntries);

			const lastStashCommit = reflogEntries[reflogEntries.length - 1].split(' ')[1];
			await isogit.writeRef({
				fs,
				dir,
				ref: 'refs/stash',
				value: lastStashCommit,
				force: true 
			});	

			console.info('refs/stash updated: was', lastStashCommit, stashRef);
		} else {
			// remove the stash reflog file
			await fs.promises.unlink(`${dir}/.git/logs/refs/stash`);
			console.info('stash reflog removed, no more stash entries');
		}
		return stashRef;

    } catch (e) {
        console.error(e);
    }
}

// stash_drop();