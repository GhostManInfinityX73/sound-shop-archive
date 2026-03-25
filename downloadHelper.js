const path = require('path');
const fs = require('fs');

const getTrackPath = (songTitle) => {
    const extensions = ['.wav', '.mp3'];
    const vaultPath = path.join(process.cwd(), 'vault');

    for (let ext of extensions) {
        const fullPath = path.join(vaultPath, `${songTitle}${ext}`);
        if (fs.existsSync(fullPath)) {
            return fullPath;
        }
    }
    return null;
};

module.exports = { getTrackPath };
