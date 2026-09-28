// eslint-disable-next-line import/no-anonymous-default-export
export default {
    // Main settings
    dir: "./public", // Directory to scan for images
    removeOriginal: true, // Delete original files after conversion
    recursive: true, // Recursive search in subdirectories
    ignoreOnStart: true, // Ignore existing files on watcher startup
    concurrency: 4, // Number of parallel workers

    // Conversion settings
    convertation: {
        converted: "*.{png,jpg,jpeg,tiff}", // Source file pattern
        format: "webp", // Target format: webp, avif, png, jpg, tiff
        quality: 80, // Quality (0-100)
        outputDir: null, // null = same folder, or path for output
    },

    // Resize settings (optional)
    needResize: false, // Enable resize
    resize: {
        width: 1920, // Width (or null)
        height: null, // Height (or null)
        fit: "cover", // cover, contain, fill, inside, outside
        position: "center", // Cropping position
        withoutEnlargement: true, // Don't enlarge small images
    },
};
