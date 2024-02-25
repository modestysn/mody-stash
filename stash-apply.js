// use isomorphic-git API to clone a github repository
import * as isogit from 'isomorphic-git';
import fs from 'fs';
import {getAndApplyFileStateChanges} from './git-util.js';

const dir = './sandbox';

async function stash_apply() {
    try {        
        // get the stash commit SHA-1 from the stash ref
        const stashCommitSHA = await isogit.resolveRef({
            fs,
            dir,
            ref: 'stash' });        

        // get the stash commit object
        const stashCommit = await isogit.readCommit({
            fs,
            dir,
            oid: stashCommitSHA });
        const { tree: stashTree, parent: stashParents } = stashCommit.commit;

        // compare the stash commit tree with it's parent commit
        for (let i = 0; i < stashParents.length - 1; i++) {
            const fileChanges = await getAndApplyFileStateChanges(dir, stashParents[i+1], stashParents[i], i === 0);
            // console.info(`fileChanges:${stashParents[i]}`, fileChanges);
        }
    
    } catch (e) {
        console.error(e);
    }
}

stash_apply();