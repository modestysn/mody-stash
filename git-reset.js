import * as isogit from 'isomorphic-git';

export async function gitReset({ dir, fs, ref, branch, hard = false }) {
    const re = /^HEAD~([0-9]+)$/;
    const m = ref.match(re);
    if (m) {
        const count = +m[1];
        const commits = await isogit.log({ fs, dir, depth: count + 1 });
        if (commits.length < count + 1) { 
            throw new Error('Not enough commits'); 
        }
        const commit = commits.pop().oid;

        try {
            await fs.promises.writeFile(
                `${dir}/.git/refs/heads/${branch}`,
                commit
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