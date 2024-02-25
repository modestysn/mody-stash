import * as isogit from 'isomorphic-git';
import fs from 'fs';

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

export function getTreeEntryType(mode) {
    let type;
    switch (mode) {
        case 0o100644:
            type = 'blob';
            break;
        case 0o040000:
            type = 'tree';
            break;
        case 0o160000:
            type = 'commit';
            break;
        default:
            type = 'unknown';
    }
    return type;
}

export function parseIndexFile(path) {
    const HEADER_SIZE = 12; // the size of the index file header in bytes
    const ENTRY_SIZE = 62; // the size of each index file entry in bytes
    const MODE = "100644"; // the mode for the blob objects
    const NULL = "\0"; // the null character
    const SPACE = " "; // the space character
    const NEWLINE = "\n"; // the newline character

    // read the index file as a buffer
    const indexBuffer = fs.readFileSync(path);

    // parse the header of the index file
    const header = indexBuffer.subarray(0, HEADER_SIZE);
    const signature = header.toString("utf8", 0, 4); // the signature should be "DIRC"
    const version = header.readUInt32BE(4); // the version number
    const entries = header.readUInt32BE(8); // the number of entries

    // parse the entries of the index file
    const entriesBuffer = indexBuffer.subarray(HEADER_SIZE, indexBuffer.byteLength);
    const entryObjects = []; // an array to store the entry objects
    let offset = 0;
    while (offset + ENTRY_SIZE < entriesBuffer.byteLength) {
        // get the ctime, mtime, dev, ino, mode, uid, gid, size, and sha1 fields
        const ctime = entriesBuffer.readUInt32BE(offset);
        const mtime = entriesBuffer.readUInt32BE(offset + 8);
        const dev = entriesBuffer.readUInt32BE(offset + 16);
        const ino = entriesBuffer.readUInt32BE(offset + 20);
        const mode = entriesBuffer.readUInt32BE(offset + 24);
        const uid = entriesBuffer.readUInt32BE(offset + 28);
        const gid = entriesBuffer.readUInt32BE(offset + 32);
        const size = entriesBuffer.readUInt32BE(offset + 36);
        const sha1 = entriesBuffer.toString("hex", offset + 40, offset + 60);
        
        // get the name
        let nameEnd = offset + 62;
        while (entriesBuffer[nameEnd] !== 0) {
            nameEnd++;
        }
        const name = entriesBuffer.toString("utf8", offset + 62, nameEnd);

        // create an entry object and push it to the array
        const entryObject = { mode: mode.toString(8), path: name, oid: sha1, type: getTreeEntryType(mode) };
        entryObjects.push(entryObject);

        // calculate the next offset
        offset = nameEnd + 1; // skip the null character
        while (offset % 8 !== 0) { // skip the padding
            offset++;
        }        
    }

    return entryObjects;
}

export function getTimezoneOffset() {
    const offsetMinutes = new Date().getTimezoneOffset();
    const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
    const offsetMinutesFormatted = Math.abs(offsetMinutes % 60).toString().padStart(2, '0');
    const sign = offsetMinutes > 0 ? '-' : '+';
    return `${sign}${offsetHours.toString().padStart(2, '0')}${offsetMinutesFormatted}`;
}

export async function writeStashReflog(dir, stashCommit, message) {
    const reflogPath = `${dir}/.git/logs/refs`;
    await fs.promises.mkdir(reflogPath, { recursive: true });

    const prevStashCommit = '0000000000000000000000000000000000000000';
    const timestamp = Math.floor(Date.now() / 1000);
    const timezoneOffset = getTimezoneOffset();
    const reflogEntry = `${prevStashCommit} ${stashCommit} GliderStash <modesty@stash.com> ${timestamp} ${timezoneOffset}\t${message}\n`;

    await fs.promises.appendFile(`${reflogPath}/stash`, reflogEntry);
}

async function writeBlobToFile(fs, dir, filepath, blobOid, addToStage = false) {
    if (!blobOid) 
        return;
    try {
        const { blob } = await isogit.readBlob({ fs, dir, oid: blobOid })
        const fileContent = Buffer.from(blob).toString('utf8');
        await fs.promises.writeFile(`${dir}/${filepath}`, fileContent);
        if (addToStage) {
            await isogit.add({ fs, dir, filepath });
        }
    } catch (e) {
        console.error(e);
    }
}

export async function getAndApplyFileStateChanges(dir, commitHash1, commitHash2, addToStage = false) {
    return isogit.walk({
      fs,
      dir,
      trees: [isogit.TREE({ ref: commitHash1 }), isogit.TREE({ ref: commitHash2 })],
      map: async function(filepath, [A, B]) {
        // ignore directories
        if (filepath === '.' || filepath.startsWith('.git')) {
          return
        }
        if ((await A?.type()) === 'tree' || (await B?.type()) === 'tree') {
          return
        }
  
        // generate ids
        const Aoid = await A?.oid()
        const Boid = await B?.oid()
  
        // determine modification type
        let type = 'equal'
        if (Aoid !== Boid) {
          type = 'modify'
          writeBlobToFile(fs, dir, filepath, Aoid, addToStage);
        }
        if (Aoid === undefined) {
          type = 'add'
          writeBlobToFile(fs, dir, filepath, Aoid, addToStage);
        }
        if (Boid === undefined) {
          type = 'remove'
          await fs.promises.unlink(`${dir}/${filepath}`);
          if (addToStage) {
            await isogit.remove({ fs, dir, filepath });
          }
        }
        if (Aoid === undefined && Boid === undefined) {
          console.error('Something weird happened:', A, B);
        }
  
        if (type == 'equal') {
          return
        }

        return {
          path: filepath,
          type: type,
          oid: Aoid
        }
      },
    })
  }

  export async function getTreeObjArrayforWorkingDir(dir) {
    return isogit.walk({
      fs,
      dir,
      trees: [isogit.WORKDIR(), isogit.TREE({ ref: 'HEAD'})],
      map: async function(filepath, [A, B]) {
        // ignore directories
        if (filepath === '.' || filepath.startsWith('.git') ) {
          return
        }
        const Atype = await A?.type();
        const Btype = await B?.type();
        if (Atype === 'special' || Btype === 'special') {
          return
        }
        if (Atype === 'commit' || Btype === 'commit') {
            return
        }
  
        // generate ids
        let Aoid = await A?.oid()
        let Boid = await B?.oid()
  
        // determine modification type
        let type = 'equal'
        if (Aoid !== Boid) {
          type = 'modify'
        }
        if (Aoid === undefined) {
          type = 'add'
        }
        if (Boid === undefined) {
          type = 'untracked'
        }
        if (Aoid === undefined && Boid === undefined) {
          console.error('Something weird happened:', A, B);
          return;
        }

        if (type === 'untracked') {
            return;
        }
  
        if (type !== 'equal') { //needs to create the Blob object and add to the tree
          const fileBuffer = await fs.promises.readFile(`${dir}/${filepath}`);
          const uint8Blob = new Uint8Array(fileBuffer);
          Aoid = await isogit.writeBlob({ fs, dir, blob: uint8Blob });
        }

        // return {
        //   path: filepath,
        //   type: type,
        //   oid: Aoid
        // }
        const mode = await A?.mode()
        return {
            mode: mode.toString(8),
            path: filepath,
            oid: Aoid,
            type: Atype,
            op: type
        }
      },
    })
  }
