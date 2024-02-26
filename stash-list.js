// use isomorphic-git API to clone a github repository
import * as isogit from 'isomorphic-git';
import fs from 'fs';
import {readAllReflogEntries} from './git-util.js';

const dir = './sandbox';

async function stash_list() {
    const stashRefLogs = [];
    try {        
        // read from stash reflog and list the stash commits
        const reflogEntries = await readAllReflogEntries(dir, 'stash');
        console.info('reflogEntries:', reflogEntries);
        if (!reflogEntries.length) {
            console.info('No stash entries found');
            return stashRefLogs;
        }
        for (let i = reflogEntries.length - 1; i >= 0; i--) {
            const entryParts = reflogEntries[i].split('\t');
            stashRefLogs.push(`stash@{${reflogEntries.length - 1 - i}}: ${entryParts[1]}`);
        }
        console.info('stashRefLogs:', stashRefLogs);
    } catch (e) {
        // console.error(e);
    } finally {
        return stashRefLogs;
    }
}

const stashResult = await stash_list();
console.info('stashResult:', stashResult);