const fs = require('fs');
const path = require('path');
const moment = require('moment');
const chokidar = require('chokidar');

const inputDir = './inputFolder';
const outputDir = './outputFolder';
const archiveDir = './archiveFolder';
const logDir = './logFolder';

// Create folders if they don't exist
const createFolders = () => {
    [inputDir, outputDir, archiveDir, logDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};

// Process MT940 file
const processFile = (fileName) => {
    const inputFile = path.join(inputDir, fileName);
    const outputFile = path.join(outputDir, fileName);
    const archiveFile = path.join(archiveDir, fileName);
    const logFile = path.join(logDir, 'transform_log.txt');

    fs.readFile(inputFile, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return;
        }

        // Write input file content to output file
        fs.writeFileSync(outputFile, data);

        // Extract the entire tag 61
        const tag61Match = data.match(/(?<=\n:61:)[^\n]*(?=\n)/);
        if (tag61Match && tag61Match.length > 0) {
            const tag61 = tag61Match[0];
            const date = tag61.slice(0, 6);
            const formattedDate = moment(date, 'YYMMDD').format('YYYYMMDD');
            const tag20Replacement = `20:${formattedDate}`;

            // Replace :20:MT940/ with formatted date
            const modifiedData = data.replace(/(?<=\n:20:)[^\r\n]+/, tag20Replacement);

            // Write modified data to output file
            fs.writeFileSync(outputFile, modifiedData);

            // Move processed file to archive folder
            fs.rename(inputFile, archiveFile, err => {
                if (err) {
                    console.error('Error moving file to archive:', err);
                    return;
                }
                console.log('File processed and moved to archive:', fileName);

                // Log transformation
                fs.appendFileSync(logFile, `${fileName}: Tag 20 transformed using Tag 61.\n`);
            });
        } else {
            console.error('Missing or invalid tag 61 in file:', fileName);
            // Log missing tag 61
            fs.appendFileSync(logFile, `${fileName}: Missing or invalid tag 61.\n`);
        }
    });
};

// Main function
const main = () => {
    createFolders();

    // Watch for changes in the input folder
    const watcher = chokidar.watch(inputDir, {
        persistent: true,
        ignoreInitial: true // Ignore initial add events
    });

    watcher.on('add', filePath => {
        const fileName = path.basename(filePath);
        console.log('File added:', fileName);
        processFile(fileName);
    });

    watcher.on('error', error => {
        console.error('Error watching input folder:', error);
    });

    console.log(`Watching for changes in ${inputDir} folder...`);
};

main();
