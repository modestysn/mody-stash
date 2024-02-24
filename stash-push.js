// use isomorphic-git API to clone a github repository
import * as isogit from 'isomorphic-git';
import fs from 'fs';
import path from 'path';
import { parseIndexFile, writeStashReflog, getTimezoneOffset } from './git-util.js';

const dir = './sandbox';

async function stash_push() {
    try {
        const stashBranch = 'stash-branch';
        
        //first, create a tree from the current index
        const indexTreeObj = parseIndexFile(`${dir}/.git/index`);
        // this indexTree will be the tree of the stash commit
        const indexTree = await isogit.writeTree({
            fs,
            dir,
            tree: indexTreeObj });

        // create the stash commit with two parents
        // create a commit from the tree, which has one parent, the current branch HEAD
        const headCommit = await isogit.resolveRef({
			fs,
			dir,
			ref: 'HEAD' });

        // Get the current branch name
        const branch = await isogit.currentBranch({
            fs,
            dir,
            fullname: false
        });
        const timestamp = Math.floor(Date.now() / 1000); // UTC Unix timestamp in seconds
        const author = { name: 'stash', email: 'modesty@stash.com', timestamp, timezoneOffset: getTimezoneOffset() };
        const stashCommitOne = await isogit.writeCommit({
			fs,
			dir,
            commit: {
			    message: `stash2-1: WIP on ${branch} - ${new Date().toISOString()}`,
			    tree: indexTree, // stashCommitTree
			    parent: [headCommit],
                author,
                committer: author
                }
            });

        //create another commit from the tree, which has two parents: HEAD and the commit we just made:
        const stashCommit = await isogit.writeCommit({
			fs,
			dir,
            commit: {
                message: `stash2-2: WIP on ${branch} - ${new Date().toISOString()}`,
                tree: indexTree, // stashCommitTree
                parent: [headCommit, stashCommitOne],
                author,
                committer: author
            }
        });

        // next, write this commit into .git/refs/stash:
        await isogit.writeRef({
            fs,
            dir,
            ref: 'refs/stash',
            value: stashCommit,
            force: true //TODO: overwrites existing stash commit current, needs to preserve it
        });
        
        // write the stash commit to the logs
        await writeStashReflog(dir, stashCommit, `WIP on ${branch}: ${new Date().toISOString()}`);

        // finally, go back to a clean working directory
		await isogit.checkout({
			fs,
			dir,
			ref: branch,
			force: true // Force checkout to discard changes
		});
        
    } catch (e) {
        console.error(e);
    }
}

stash_push();