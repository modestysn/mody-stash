// use isomorphic-git API to clone a github repository
import * as isogit from 'isomorphic-git';
import fs from 'fs';
import http from 'isomorphic-git/http/node/index.cjs';

const dir = './sandbox';

async function stash_push() {
    try {
        const stashBranch = 'stash-branch';
        // setup: create a temporary branch
        const branch = await isogit.currentBranch({
            fs,
            dir,
            fullname: false
          })
        console.log('current branch:', branch);

        await isogit.branch({ 
            fs, 
            dir, 
            ref: stashBranch,
            checkout: true });

        // commit to the temporary branch
        const stashCommitOne = await isogit.commit({
			fs,
			dir,
			message: `stash: WIP on ${branch} - ${new Date().toISOString()}`,
			ref: `refs/heads/${stashBranch}` }); 
        console.info('stashCommitOne:', stashCommitOne);

        //first, create a tree from the current index
        // const headCommit = await isogit.resolveRef({
		// 	fs,
		// 	dir,
		// 	ref: 'HEAD' });
        // console.info('headCommit:', headCommit);

        // const headCommitTree = await isogit.readTree({
		// 	fs,
		// 	dir,
        //     format: 'parsed', // return the tree object as an array of entries
		// 	filepath: '', //Don't return the object with oid itself, but resolve oid to a tree and then return the object at that filepath. To return the root directory of a tree set filepath to ''
		// 	oid: headCommit });
        // console.info('headCommitTree:', headCommitTree);

        // const indexTreeObj = headCommitTree.tree;
        // const indexTree = await isogit.writeTree({
		// 	fs,
		// 	dir,
		// 	tree: [...indexTreeObj] });
        // console.info('writeTreeOid===readTreeOid?\n', indexTree, headCommitTree.oid);

        // // second, create a commit from the tree, which has one parent, the current branch HEAD:
		// const stashCommitOne = await isogit.commit({
		// 	fs,
		// 	dir,
		// 	message: `stash2-1: WIP on ${branch} - ${new Date().toISOString()}`,
		// 	tree: indexTree, // stashCommitTree
		// 	parent: [headCommit] });
        // console.info('stashCommitOne:', stashCommitOne);

        // // then, create another commit from the tree, which has two parents: HEAD and the commit we just made:
        // const stashCommit = await isogit.commit({
		// 	fs,
		// 	dir,
		// 	message: `stash2-2: WIP on ${branch} - ${new Date().toISOString()}`,
		// 	tree: indexTree, // stashCommitTree
		// 	parent: [headCommit, stashCommitOne] });
        // console.info('stashCommit:', stashCommit);

        // // next, write this commit into .git/refs/stash:
        // await isogit.writeRef({
        //     fs,
        //     dir,
        //     ref: 'refs/stash',
        //     value: stashCommit,
        //     force: true //TODO: overwrites existing stash commit current, needs to preserve it
        // });
        // // Print out stash file
        // const stashFile = await fs.promises.readFile(`${dir}/.git/refs/stash`, 'utf8');
        // console.log(`refs/stash: ${stashFile}`);
        
        // // write the stash commit to the logs
		// // only supports no previous stash commit for now
		// const prevStashCommit = '0000000000000000000000000000000000000000';
		// const logEntry = `${prevStashCommit} ${stashCommit} ${branch}\n`;
        // await fs.promises.mkdir(`${dir}/.git/logs/refs`, { recursive: true });
        // await fs.promises.writeFile( `${dir}/.git/logs/refs/stash`, logEntry, 'utf8');
        // const stashLog = await fs.promises.readFile(`${dir}/.git/logs/refs/stash`, 'utf8');
        // console.log(`stashLog: ${stashLog}`);

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