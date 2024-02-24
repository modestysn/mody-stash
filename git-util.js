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

