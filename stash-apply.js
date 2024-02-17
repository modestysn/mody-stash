// use isomorphic-git API to clone a github repository
import * as isogit from 'isomorphic-git';
import fs from 'fs';
import {gitReset} from './git-reset.js';

const dir = './sandbox';

async function stash_push() {
    try {
        const stashBranch = 'stash-branch';

        const branch = await isogit.currentBranch({
            fs,
            dir,
            fullname: false
          })
        console.info('original branch:', branch);

        if (branch === stashBranch) {
            throw new Error('Cannot stash on the stash branch');
        }

        // checkout stash branch and restore its index and working tree
        const mergeResult = await isogit.merge({
            fs,
            dir,
            ours: branch,
            theirs: stashBranch,
            abortOnConflict: false,
        });
        console.info('mergeResult:', mergeResult);

        // TODO: need to bring last commits from history to index and working tree
        // reset the stash branch to the previous commit
        await gitReset({
            dir, 
            fs,
            ref: 'HEAD~1', 
            branch, 
            hard: false});
        

        const headsBranch = await fs.promises.readFile(`${dir}/.git/refs/heads/${stashBranch}`, 'utf8');
        console.log(`stash-branch HEAD: ${headsBranch}`);    

        const indexContent = await fs.promises.readFile(`${dir}/.git/index`, 'utf8');
        console.log(`current index: ${indexContent}`);    


        // console.log('branch resetted:', await isogit.currentBranch({
        //         fs,
        //         dir,
        //         fullname: false
        //       }));
            
        // checkout the original branch
        // await isogit.checkout({
        //     fs,
        //     dir,
        //     ref: branch
        // });
        // console.log('branch recovered:', await isogit.currentBranch({
        //     fs,
        //     dir,
        //     fullname: false
        //   }));
    
    } catch (e) {
        console.error(e);
    }
}

stash_push();