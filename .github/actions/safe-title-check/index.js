const core = require('@actions/core');

async function run() {
  try {
    core.info(`I'm the Safe Title Check Custom Action`);
    core.info(`Starting Safe Title Check Action`);
    const pullRequestTitle = core.getInput('pull-request-title');
    core.info(`Pull Request Title: ${pullRequestTitle}`);
    const safeTitlePattern = core.getInput('safe-title-pattern');
    core.info(`Safe Title Pattern: ${safeTitlePattern}`);
    const regex = new RegExp(safeTitlePattern);
    if (!regex.test(pullRequestTitle)) {
      core.setFailed(`Pull request title does not match the safe title pattern.`);
      return;
    }
    core.info(`Pull request title matches the safe title pattern. Action completed successfully.`);
  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

run();
