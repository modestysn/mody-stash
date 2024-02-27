// use isomorphic-git API to clone a github repository
import * as isogit from 'isomorphic-git';
import fs from 'fs';
import {getAndApplyFileStateChanges} from './git-util.js';

const dir = './sandbox';

export async function stash_apply() {
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
        const { parent: stashParents } = stashCommit.commit;

        // compare the stash commit tree with it's parent commit
        for (let i = 0; i < stashParents.length - 1; i++) {
            const applyingCommit = await isogit.readCommit({
                fs,
                dir,
                oid: stashParents[i+1] });
            const wasStaged = applyingCommit.commit.message.startsWith('stash-Index');

            const fileChanges = await getAndApplyFileStateChanges(dir, stashParents[i+1], stashParents[i], wasStaged);
            console.info(`fileChanges:${stashParents[i]}`, fileChanges);
        }

        return stashCommitSHA;
    
    } catch (e) {
        console.error(e);
    }
}

// stash_apply();