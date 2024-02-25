// use isomorphic-git API to clone a github repository
import * as isogit from 'isomorphic-git';
import fs from 'fs';
import { parseIndexFile, writeStashReflog, getTimezoneOffset, getTreeObjArrayforWorkingDir } from './git-util.js';

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

        // prepare the stansh commit
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
        
        // create a commit from the index tree, which has one parent, the current branch HEAD
        const stashCommitOne = await isogit.writeCommit({
			fs,
			dir,
            commit: {
			    message: `stash3-1: WIP on ${branch} - Index - ${new Date().toISOString()}`,
			    tree: indexTree, // stashCommitTree
			    parent: [headCommit],
                author,
                committer: author
                }
            });

        // create a tree from the current working directory
        const workingTreeObjects = await getTreeObjArrayforWorkingDir(dir);
        const workingTree = await isogit.writeTree({
            fs,
            dir,
            tree: workingTreeObjects });
        // create a commit from the working directory tree, which has one parent, the one we just had
        const workingHeadCommit = await isogit.writeCommit({
			fs,
			dir,
            commit: {
			    message: `stash3-2: WIP on ${branch} - ${new Date().toISOString()}`,
			    tree: workingTree, 
			    parent: [stashCommitOne],
                author,
                committer: author
                }
            });
        

        //create another commit from the tree, which has three parents: HEAD and the commit we just made:
        const stashCommit = await isogit.writeCommit({
			fs,
			dir,
            commit: {
                message: `stash2-2: WIP on ${branch} - ${new Date().toISOString()}`,
                tree: indexTree, // stashCommitTree
                parent: [headCommit, stashCommitOne, workingHeadCommit],
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
// const workingTreeObjects = await getTreeObjArrayforWorkingDir(dir);
// console.info('workingTreeObjects:', workingTreeObjects);

