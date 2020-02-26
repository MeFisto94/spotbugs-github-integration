# jMonkeyEngine SpotBugs CI Plugin

This plugin is part of the jMonkeyEngine Continuous Integration Infrastructure.  
In order to reduce the workload for reviewers and increase the confidence into the review, automatic static analysis of the codebase will take place for every commit.  

Since the output produced by the static analysis for the whole project would be very verbose and overwhelming, this code will compare the differences between `master` and the commit.  

The differential result is then presented using Github's Check UI, this means Github Actions will present inline comments to the code diff showing where a previous bug has been solved and where a new bug has been added. It also shows a basic list of bugs together with the number of solved and newly added buffs.  

## How to install

"Installing" this plugin is really easy:

- Make sure to copy the default settings file located under `.github/spotbugs/config.yaml` from this repository to your repository
- Setup your CI, so that it clones this repository into your build folder (as a subfolder)
- Setup your CI, so that `npm start` is called (You might need `npm install` before that)

This plugin makes a few assumptions about your repository and if the structure differs, you need to change paths accordingly.  
In addition to that, ensure that `GITHUB_TOKEN` is present as environment variable, this is typically available in Github Actions as a _secret_.  

Currently there is one flaw when using this code on your repository: The path to Gradle and the SpotBugs Analysis files is hardcoded to be `../`, this however means that this code needs to be a direct subfolder of your main repository. You can fork this repository and change `index.js`'s  `relativePath`, but a more professional solution would be to allow for a command line parameter to directly specify the path from your CI.
