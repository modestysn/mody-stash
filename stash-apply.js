// use isomorphic-git API to clone a github repository
import * as isogit from 'isomorphic-git';
import fs from 'fs';
import http from 'isomorphic-git/http/node/index.cjs';

const dir = './sandbox';

async function gitReset({ dir, ref, branch, hard = false }) {
    const re = /^HEAD~([0-9]+)$/;
    const m = ref.match(re);
    if (m) {
        const count = +m[1];
        const commits = await isogit.log({ fs, dir, depth: count + 1 });
        console.info('commits:', commits);
        const commit = commits.pop().oid;
        console.log('commit:', commit);

        try {
            await fs.promises.writeFile(
                `${dir}/.git/refs/heads/${branch}`,
                commit + '\n'
            );

            if (hard) {
                // clear the index (if any)
                await fs.promises.unlink(`${dir}/.git/index`);

                // checkout the branch into the working tree
                await isogit.checkout({ dir, fs, ref: branch });
            }
        } catch (err) {
            throw err;
        }
    } else {
        throw new Error(`Wrong ref ${ref}`);
    }
}

async function stash_push() {
    try {
        const stashBranch = 'stash-branch';

        const branch = await isogit.currentBranch({
            fs,
            dir,
            fullname: false
          })
        console.info('original branch:', branch);

        // checkout stash branch and restore its index and working tree
        // await isogit.checkout({
        //     fs,
        //     dir,
        //     ref: stashBranch
        // });
        // console.log('branch checkedout:', await isogit.currentBranch({
        //     fs,
        //     dir,
        //     fullname: false
        //   }));

        // reset the stash branch to the previous commit
        await gitReset({
            dir, 
            ref: 'HEAD~1', 
            branch: stashBranch, 
            hard: false});

        const headsBranch = await fs.promises.readFile(`${dir}/.git/refs/heads/${branch}`, 'utf8');
        console.log(`headsBranch: ${headsBranch}`);    

        const indexContent = await fs.promises.readFile(`${dir}/.git/index`, 'utf8');
        console.log(`gitConfig: ${indexContent}`);    


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