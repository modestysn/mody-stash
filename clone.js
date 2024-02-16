// use isomorphic-git API to clone a github repository
import * as isogit from 'isomorphic-git';
import fs from 'fs';
import http from 'isomorphic-git/http/node/index.cjs';

const dir = './sandbox';
async function clone() {
    try {
        // Initialize a new git repository        
        await isogit.init({ fs, dir });
        console.info('Initialized a new git repository');

        // Write config value
        await isogit.setConfig({
            fs,
            dir,
            path: 'user.name',
            value: 'Glider IDE'
        });
        // Print out config file
        const gitConfig = await fs.promises.readFile(`${dir}/.git/config`, 'utf8');
        console.log(`gitConfig: ${gitConfig}`);

        // Clone a remmote repository
        await isogit.clone({
            fs,
            http,
            dir,
            url: 'https://github.com/modestysn/idegit',
            ref: 'main',
            depth: 1,
            singleBranch: false,
        });

        const repoDir = await fs.promises.readdir(dir);
        console.info('Cloned the repository - ', repoDir);
    } catch (e) {
        console.error(e);
    }
}

clone();
