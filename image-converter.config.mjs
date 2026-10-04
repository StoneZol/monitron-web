/* eslint-disable import/no-anonymous-default-export */
export default {
    // Shared
    recursive: true, // walk subfolders under each command's dir
    concurrency: 4, // parallel workers
    ignoreOnStart: true, // watch: skip files that already exist on startup

    // --- convert + watch (auto-convert-images / auto-convert-images-watch) ---
    convertation: {
        dir: "./public/original", // where to look for sources (cwd-relative or absolute)
        removeOriginal: true, // delete source from convertation.dir after success
        converted: "png,jpg,jpeg,tiff", // source formats (comma-separated)
        format: "webp", // output codec: webp | avif | png | jpg | jpeg | tiff
        quality: 80, // 0–100
        outputDir: "./public/s", // null = next to source
        outputDirMode: "flat", // flat | mirror (mirror keeps subfolders from dir)

        needResize: true, // resize once, then encode → outputDir
        needResizeOriginal: true, // also write resized SOURCE format → resize.outputDir
    },

    // --- resize geometry + resize / resize:watch (no format change) ---
    resize: {
        dir: "./public/converted", // scan folder for resize CLI / resize:watch
        removeOriginal: false, // independent from convertation.removeOriginal
        width: 1200, // or null if only height
        height: 630, // or null if only width
        fit: "cover", // cover | contain | fill | inside | outside
        position: "center",
        withoutEnlargement: true, // don't upscale smaller images

        targetFormat: "webp", // which files to resize: "webp" | "png,jpg" | null → convertation.format
        outputDir: "./public/og", // null + removeOriginal true → overwrite; false → -1920w suffix
        outputDirMode: "flat",
    },
};
