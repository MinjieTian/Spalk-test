import { parseTsFile } from './utils/utils'

const filePath = process.argv[2];
if (!filePath) {
    console.error('Please specify a file path');
    process.exit(1);
}
parseTsFile(filePath);

module.exports = parseTsFile;