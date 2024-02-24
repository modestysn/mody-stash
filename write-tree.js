// require the fs and crypto modules
const fs = require("fs");
const crypto = require("crypto");

// define some constants
function parseIndexFile(path) {
    const HEADER_SIZE = 12; // the size of the index file header in bytes
    const ENTRY_SIZE = 62; // the size of each index file entry in bytes
    const MODE = "100644"; // the mode for the blob objects
    const NULL = "\0"; // the null character
    const SPACE = " "; // the space character
    const NEWLINE = "\n"; // the newline character

    // read the index file as a buffer
    const indexBuffer = fs.readFileSync(path);

    // parse the header of the index file
    const header = indexBuffer.slice(0, HEADER_SIZE);
    const signature = header.toString("utf8", 0, 4); // the signature should be "DIRC"
    const version = header.readUInt32BE(4); // the version number
    const entries = header.readUInt32BE(8); // the number of entries

    // parse the entries of the index file
    const entriesBuffer = indexBuffer.slice(HEADER_SIZE, HEADER_SIZE + entries * ENTRY_SIZE);
    const entryObjects = []; // an array to store the entry objects
    for (let i = 0; i < entries; i++) {
        // get the entry buffer
        const entryBuffer = entriesBuffer.slice(i * ENTRY_SIZE, (i + 1) * ENTRY_SIZE);
        // get the ctime, mtime, dev, ino, mode, uid, gid, size, and sha1 fields
        const ctime = entryBuffer.readUInt32BE(0);
        const mtime = entryBuffer.readUInt32BE(8);
        const dev = entryBuffer.readUInt32BE(16);
        const ino = entryBuffer.readUInt32BE(20);
        const mode = entryBuffer.readUInt32BE(24);
        const uid = entryBuffer.readUInt32BE(28);
        const gid = entryBuffer.readUInt32BE(32);
        const size = entryBuffer.readUInt32BE(36);
        const sha1 = entryBuffer.toString("hex", 40, 60);
        // get the name length and name fields
        const nameLength = entryBuffer[62] + (entryBuffer[63] << 8);
        const name = indexBuffer.toString("utf8", HEADER_SIZE + entries * ENTRY_SIZE + i * 8, HEADER_SIZE + entries * ENTRY_SIZE + i * 8 + nameLength);
        // create an entry object and push it to the array
        const entryObject = { mode, path: name, oid: sha1, type: "blob" };
        entryObjects.push(entryObject);
    }

    return entryObjects;
}

// generate the tree object data
let treeData = "";
for (const entryObject of entryObjects) {
  // append the mode, space, name, null, and sha1 fields
  treeData += MODE + SPACE + entryObject.name + NULL + Buffer.from(entryObject.sha1, "hex");
}
// add a newline at the end
treeData += NEWLINE;

// create a SHA-1 hash of the tree object data
const hash = crypto.createHash("sha1");
hash.update(treeData);
const treeOid = hash.digest("hex");

// write the tree object data to the .git/objects directory
const objectPath = ".git/objects/" + treeOid.slice(0, 2) + "/" + treeOid.slice(2);
fs.writeFileSync(objectPath, treeData);

// print the name of the new tree object
console.log(treeOid);
