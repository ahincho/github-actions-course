const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');

function isValidBranchName(branchName) {
  const branchRegex = /^[a-zA-Z0-9_.\-\/]+$/;
  return branchRegex.test(branchName);
}

function isValidDirectoryPath(directoryPath) {
  const directoryRegex = /^[a-zA-Z0-9_.\-\/]+$/;
  return directoryRegex.test(directoryPath);
}

async function getPackageVersions(cwd) {
  const result = await exec.getExecOutput('npm', ['list', '--depth=0', '--json'], { cwd });
  return JSON.parse(result.stdout);
}

function getUpdatedDeps(before, after) {
  const updated = [];
  const compareDeps = (beforeDeps, afterDeps, type) => {
    if (!beforeDeps || !afterDeps) return;
    for (const [pkg, info] of Object.entries(afterDeps)) {
      const beforeInfo = beforeDeps[pkg];
      if (beforeInfo && beforeInfo.version !== info.version) {
        updated.push(`${pkg}@${type}: ${beforeInfo.version} -> ${info.version}`);
      }
    }
  };
  compareDeps(before.dependencies, after.dependencies, 'dep');
  compareDeps(before.devDependencies, after.devDependencies, 'devDep');
  return updated;
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
    const beforeVersions = await getPackageVersions(workingDirectory);
    await exec.exec('npm update', [], { cwd: workingDirectory });
    const afterVersions = await getPackageVersions(workingDirectory);
    const updatedDeps = getUpdatedDeps(beforeVersions, afterVersions);
    if (updatedDeps.length === 0) {
      core.info('No dependencies were updated. Exiting.');
      return;
    }
    core.info('Detected updated dependencies.');
    core.setOutput('updated-dependencies', updatedDeps.join('\n'));
    await exec.exec('git', ['config', 'user.name', github.context.actor], { cwd: workingDirectory });
    await exec.exec('git', ['config', 'user.email', `${github.context.actor}@users.noreply.github.com`], { cwd: workingDirectory });
    await exec.exec('git', ['checkout', '-b', targetBranch], { cwd: workingDirectory });
    await exec.exec('git', ['add', 'package*.json'], { cwd: workingDirectory });
    await exec.exec('git', ['commit', '-m', 'Chore: Update JS Dependencies'], { cwd: workingDirectory });
    await exec.exec('git', ['push', '--set-upstream', 'origin', targetBranch], { cwd: workingDirectory });
    const octokit = github.getOctokit(githubToken);
    await octokit.rest.pulls.create({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      title: "Chore: Update JS Dependencies",
      body: "This PR updates the JavaScript dependencies to their latest versions.",
      base: baseBranch,
      head: targetBranch
    });
  } catch (error) {
    core.setFailed(`Unexpected error: ${error.message}`);
  }
}

run();
