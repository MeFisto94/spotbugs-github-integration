const settings = require('./settings');

module.exports = new class PathUtils {
    /**
     * Extracts the jme module out of the full path
     * @param {The relative path to the spotbugs output file} path
     */
    extractModuleName = (path) => {
        /* The following code looks bad but we cannot use regex properly here due
        * to the paths needing to be escaped.
        */
        if (path.startsWith(settings.config.relativePath) && path.endsWith(settings.config.resultPath)) {
            return path.substring(settings.config.relativePath.length, path.indexOf(settings.config.resultPath) - 1);
        } else {
            throw Error("Not a valid path!");
        }
    };

    /**
     * Extracts the jme module out of the full old path
     * @param {The relative path to the spotbugs file of previous runs} path
     */
    extractModuleNameOldPath = (path) => {
        if (path.startsWith(settings.config.relativePath + settings.repositorySpotbugsPath + "/") && path.endsWith(".xml")) {
            return path.substring((settings.config.relativePath + settings.repositorySpotbugsPath + "/").length, path.indexOf(".xml"));
        } else {
            throw Error("Not a valid path");
        }
    }
}