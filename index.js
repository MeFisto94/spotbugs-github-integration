const exec = require('child-process-promise').exec;
const glob = require('glob-promise');
const xml2js = require('xml2js');
const fs = require('fs');
const util = require('util');
const readFileAsync = util.promisify(fs.readFile);

const settings = require('./settings');
const comparators = require('./comparators');
const path = require('./path_util');

const github = require('@actions/github');
const core = require('@actions/core');
const repositorySpotbugsPath = settings.repositorySpotbugsPath;


let comparator = comparators.classAndSignatureComparator;
let relativePath = "../../"; // @TODO: Pass externally.


async function gradlew(task) {
    return exec("cd " + relativePath + " && java -cp " +
    settings.config.gradle_wrapper.classpath + " " +
    settings.config.gradle_wrapper.mainClass + " " + task)
}

async function generateReportsAndAnalyse() {
    await gradlew(settings.config.gradle_wrapper.commandLine)
          .then(out => { console.log(out.stdout); console.log(out.stderr); })
          .catch(err => { console.error(err) });

    let reports = {};

    const files = await glob(relativePath + '**/' + settings.config.resultPath);

    await Promise.all(files.map(async file =>
        {
            try {
                const result = await xml2js.parseStringPromise(await readFileAsync(file) /*, options */);
                const moduleName = path.extractModuleName(file);

                if (result.BugCollection.BugInstance) {
                    reports[moduleName] = result.BugCollection.BugInstance;
                } else {
                    console.log("Great Work! " + moduleName + " doesn't contain any bugs!");
                }
            } catch (err) {
                console.error(err);
            }
        })
    );

    return reports;
}

function format(obj) {
    // @TODO: Add Method/Field and SourceLine
    return obj.$.type + " => " + obj.Class[0].$.classname;
}

async function loadOldReports() {
    let reports = {};

    const files = await glob(relativePath + repositorySpotbugsPath + "/*.xml");

    await Promise.all(files.map(async file =>
        {
            try {
                const result = await xml2js.parseStringPromise(await readFileAsync(file) /*, options */);
                const moduleName = path.extractModuleNameOldPath(file);

                if (result.BugCollection.BugInstance) {
                    reports[moduleName] = result.BugCollection.BugInstance;
                } else {
                    console.log(moduleName + " didn't contain any bugs!");
                }
            } catch(err) {
                console.error(err);
            }
        })
    );

    return reports;
}

function createAnnotations() {
    const res = [];

    new_bugs.forEach(bug => {
        const src = bug.bug.SourceLine ? bug.bug.SourceLine : (bug.bug.Method ? bug.bug.Method[0].SourceLine : (bug.bug.Field ? bug.bug.Field[0].SourceLine : undefined));

        if (src) {
            src.forEach(line => {
                res.push({
                    path: bug.module + settings.config.relativeModulePath + line.$.sourcepath,
                    start_line: line.$.start,
                    end_line: line.$.end,
                    annotation_level: bug.bug.priority == "1" ? "failure" : "warning",
                    message: settings.config.checks.report.new_bug + "\nCategory: " + bug.bug.$.category + "\nType: " + bug.bug.$.type
                });
            });
        } else {
            console.error("Warning: Found a bug without a SourceLine Attribute!!");
            console.dir(bug.bug);
        }
    });

    solved_bugs.forEach(bug => {
        const src = bug.bug.SourceLine ? bug.bug.SourceLine : (bug.bug.Method ? bug.bug.Method[0].SourceLine : (bug.bug.Field ? bug.bug.Field[0].SourceLine : undefined));
        if (src) {
            src.forEach(line => {
                res.push({
                    path: bug.module + settings.config.relativeModulePath + line.$.sourcepath,
                    start_line: line.$.start,
                    end_line: line.$.end,
                    annotation_level: "notice",
                    message: "🎉 This bug has been solved! 🎊\nCategory: " + bug.bug.$.category + "\nType: [" + bug.bug.$.type + "](https://spotbugs.readthedocs.io/en/latest/bugDescriptions.html)"
                });
            });
        } else {
            console.error("Warning: Found a bug without a SourceLine Attribute!!");
            console.dir(bug.bug);
        }
    });

    return res;
}

(async () => {
    settings.loadConfig();
    const token = process.env.GITHUB_TOKEN;
    const octokit = new github.GitHub(token);

    check_run = await octokit.checks.create({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        name: settings.config.checks.task.title,
        head_sha: github.context.sha,
        status: 'in_progress',
        output: {
          title: settings.config.checks.report.title,
          summary: settings.config.checks.report.pending
        }
    });

    reports_new = await generateReportsAndAnalyse();
    reports_old = await loadOldReports();

    new_bugs = [];
    solved_bugs = [];

    for (let [key, value] of Object.entries(reports_new)) {
        if (reports_old[key]) {
            console.error("Now analyzing additional bugs for " + key);
            value.forEach(error => {
                if (!reports_old[key].some(oldError => comparator(error, oldError))) {
                    //console.error("Warning: Found new bug " + util.inspect(error, false, null));
                    console.error("Warning: Found new bug " + format(error));
                    new_bugs.push({bug: error, module: key});
                }
            });
        } else {
            console.error("Warning: Previously bugless module " + key +  " now has bugs!");
            value.forEach(error => {
                new_bugs.push({bug: error, module: key});
                //console.error("Warning: Found new bug " + format(error));
                //console.error("Warning: Found new bug " + util.inspect(error, false, null));
            });
        }
    }

    for (let [key, value] of Object.entries(reports_old)) {
        if (reports_new[key]) {
            console.error("Now analyzing solved bugs for " + key);
            value.forEach(error => {
                if (!reports_new[key].some(newError => comparator(error, newError))) {
                    solved_bugs.push({bug: error, module: key});
                    console.error("Congratulations! Solved bug " + format(error));
                }
            });
        } else {
            console.error("Congratulations! The module " + key + " has become bugless!");
            value.forEach(error => {
                solved_bugs.push({bug: error, module: key});
                console.error("Congratulations! Solved bug " + format(error));
            });
        }
    }

    success = new_bugs.length > 0;
    summary = settings.config.checks.summary.header
    summary += "# New Bugs: " + new_bugs.length + "\n";
    new_bugs.forEach(bug => summary += ("- " + format(bug.bug) + "\n"));
    summary += "# Solved old Bugs: " + solved_bugs.length + "\n";
    solved_bugs.forEach(bug => summary += ("- " + format(bug.bug) + "\n"));

    err_too_long = "\n[...] and many more!";

    const res = createAnnotations();

    // we have to fill res with all the file annotations.
    const updates = [];

    while (res.length) {
      updates.push(res.splice(0, 50)) // Only 50 annotations allowed per request
    }

    updates.forEach(annotations => {
        octokit.checks.update({
            check_run_id: check_run.data.id,
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            conclusion: success ? "success" : "failure",
            output: {
                title: settings.config.checks.report.title,
                // @TODO: We don't need this anymore when we have annotations
                //(summary.length < 65535) ? summary : (summary.substring(0, 65535 - err_too_long.length) + err_too_long),
                summary: "New Bugs: " + new_bugs.length + "\nFixed Bugs: " + solved_bugs.length,
                text: summary,
                annotations: annotations
            }
        }).catch(err => console.error(err));
    });
})();