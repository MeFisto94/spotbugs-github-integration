const yaml = require('js-yaml');
const fs = require('fs');

module.exports = new class Configurator {
  loadConfig = () => {
    try {
        this.config = yaml.safeLoad(fs.readFileSync(this.repositorySpotbugsPath + "/config.yaml", 'utf8'));
      } catch (e) {
        console.error(e);
      }
  };

  // This exposes the loaded configuration file
  config = {};

  // This is the folder that has to contain the configuration
  repositorySpotbugsPath = ".github/spotbugs";
};