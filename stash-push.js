// use isomorphic-git API to clone a github repository
import * as isogit from 'isomorphic-git';
import fs from 'fs';
import { getTreeObjArrayStage, writeStashReflog, getTimezoneOffset, getTreeObjArrayforWorkingDir } from './git-util.js';

const dir = './sandbox';

async function stash_push() {
    try {
        // Get the current branch name
        const branch = await isogit.currentBranch({
            fs,
            dir,
            fullname: false
        });
        
        // prepare the stansh commit: first parent is the current branch HEAD
        const headCommit = await isogit.resolveRef({
			fs,
			dir,
			ref: 'HEAD' });

        const stashCommitParents = [headCommit];
        let stashCommitTree = null;
        let workDirCompareBase = isogit.TREE({ ref: 'HEAD'});

        const timestamp = Math.floor(Date.now() / 1000); // UTC Unix timestamp in seconds
        const author = { name: 'stash', email: 'modesty@stash.com', timestamp, timezoneOffset: getTimezoneOffset() };
        
        //try to create a tree from the current index if any changes staged
        const indexTreeObj = await getTreeObjArrayStage(dir);
        if (indexTreeObj.length > 0) {
            console.info('indexTreeObj:', indexTreeObj);
            // this indexTree will be the tree of the stash commit
            const indexTree = await isogit.writeTree({
                fs,
                dir,
                tree: indexTreeObj });
        
            // create a commit from the index tree, which has one parent, the current branch HEAD
            const stashCommitOne = await isogit.writeCommit({
                fs,
                dir,
                commit: {
                    message: `stash-Index: WIP on ${branch} - ${new Date().toISOString()}`,
                    tree: indexTree, // stashCommitTree
                    parent: stashCommitParents,
                    author,
                    committer: author
                    }
                });
            stashCommitParents.push(stashCommitOne);
            stashCommitTree = indexTree;
            workDirCompareBase = isogit.STAGE();
        }

        // create a tree from the current working directory
        const workingTreeObjects = await getTreeObjArrayforWorkingDir(dir, workDirCompareBase);
        if (workingTreeObjects.length> 0) {
            console.info('workingTreeObjects:', workingTreeObjects);
            const workingTree = await isogit.writeTree({
                fs,
                dir,
                tree: workingTreeObjects });
            // create a commit from the working directory tree, which has one parent, the one we just had
            const workingHeadCommit = await isogit.writeCommit({
                fs,
                dir,
                commit: {
                    message: `stash-WorkDir: WIP on ${branch} - ${new Date().toISOString()}`,
                    tree: workingTree, 
                    parent: [stashCommitParents[stashCommitParents.length-1]],
                    author,
                    committer: author
                    }
                });
            stashCommitParents.push(workingHeadCommit);
            stashCommitTree = workingTree;
        }

        if (stashCommitTree === null) {
            console.info('No changes to stash');
            return;
        }
            
        //create another commit from the tree, which has three parents: HEAD and the commit we just made:
        const stashCommit = await isogit.writeCommit({
			fs,
			dir,
            commit: {
                message: `stash: WIP on ${branch} - ${new Date().toISOString()}`,
                tree: stashCommitTree,
                parent: stashCommitParents,
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

// const indexTreeObj = await getTreeObjArrayStage(dir);
// console.info('indexTreeObj:', indexTreeObj);
