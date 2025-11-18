const core = require('@actions/core');
const exec = require('@actions/exec');

function isValidBranchName(branchName) {
  const branchRegex = /^[a-zA-Z0-9_.\-\/]+$/;
  return branchRegex.test(branchName);
}

function isValidDirectoryPath(directoryPath) {
  const directoryRegex = /^[a-zA-Z0-9_.\-\/]+$/;
  return directoryRegex.test(directoryPath);
}

/*
  1. Parse inputs:
    1.1 Base-branch from which to check for updates
    1.2 Target-branch to use to create the PR
    1.3 GitHub Token for authentication purposes (to create PRs)
    1.4 Working directory for which to check for dependencies
  2. Execute the npm update command within the working directory
  3. Check whether there are modified package*.json files
  4. If there are modified files:
    4.1 Add and commit files to the target-branch
    4.2 Create a PR to the base-branch using the octokit API
  5. Otherwise, conclude the custom action
*/
async function run() {
  try {
    core.info(`I'm a Custom Action built with NodeJs and JavaScript!`);
    const baseBranch = core.getInput('base-branch');
    const targetBranch = core.getInput('target-branch');
    const workingDirectory = core.getInput('working-directory');
    const githubToken = core.getInput('github-token');
    const debugModeEnabled = core.getBooleanInput('debug');
    core.setSecret(githubToken);
    if (!isValidBranchName(baseBranch)) {
      core.setFailed(`Invalid base-branch format. Must contain only letters, digits, underscores, hyphens, dots, and forward slashes. Received: ${baseBranch}`);
      return;
    }
    if (!isValidBranchName(targetBranch)) {
      core.setFailed(`Invalid target-branch format. Must contain only letters, digits, underscores, hyphens, dots, and forward slashes. Received: ${targetBranch}`);
      return;
    }
    if (!isValidDirectoryPath(workingDirectory)) {
      core.setFailed(`Invalid working-directory format. Must contain only letters, digits, underscores, hyphens, and forward slashes. Received: ${workingDirectory}`);
      return;
    }
    core.info(`Base Branch: ${baseBranch}`);
    core.info(`Target Branch: ${targetBranch}`);
    core.info(`Working Directory: ${workingDirectory}`);
    core.info(`Debug Mode Enabled: ${debugModeEnabled}`);
    await exec.exec('npm update', [], { cwd: workingDirectory });
    const gitStatus = await exec.getExecOutput('git', ['status', '-s', 'package*.json'], { cwd: workingDirectory }); 
    if (gitStatus.stdout.trim().length > 0) {
      core.info('Detected changes in package files after npm update.');
    } else {
      core.info('No changes detected in package files after npm update. Exiting.');
    }
  } catch (error) {
    core.setFailed(`Unexpected error: ${error.message}`);
  }
}

run();
