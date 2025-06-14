script({
  responseType: "markdown",
  accept: "none",
  title: "Pull Request Descriptor",
  description:
    "Generate a pull request description based on the changes in the codebase",
  branding: {
    color: "yellow",
    icon: "hard-drive",
  },
  parameters: {
    base: {
      type: "string",
      description: "The base branch of the pull request",
    },
    gitmojis: {
      type: "boolean",
      description: "Whether to use gitmojis in the pull request description",
      default: true,
    },
    instructions: {
      type: "string",
      description: "Instructions for the code reviewer",
    },
    excluded: {
      type: "string",
      description: "Excluded paths from diff",
    },
  },
});

const { vars, dbg } = env;
const {
  instructions,
  gitmojis,
  excluded = "",
} = vars as {
  instructions: string;
  gitmojis: boolean;
  excluded: string;
};
const maxTokens = 7000;
const base = vars.base || (await git.defaultBranch());
const branch = await git.branch();

console.debug(`base: %s`, base);
console.debug(`branch: %s`, branch);
dbg(`excluded: %s`, excluded);

if (branch === base) cancel(`Already on the base branch '${base}!`);

// make sure the base branch is fetched
await git.exec(["fetch", "origin", base]);

// compute diff
const changes = await git.diff({
  base: `origin/${base}`,
  ignoreSpaceChange: true,
  maxTokensFullDiff: maxTokens,
  llmify: true,
  excludedPaths: [
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    ...excluded.split(/\r?\n|;/g),
  ].filter(Boolean),
});

if (!changes) cancel("No changes detected");

console.debug(changes);

def("GIT_DIFF", changes, {
  maxTokens,
  detectPromptInjection: "available",
});

// task
$`## Task

You are an expert code reviewer with great technical writing skills.

Your task is to generate a high level summary of the changes in <GIT_DIFF> for a pull request in a way that a software engineer will understand.
This description will be used as the pull request description.

## Instructions

- do NOT explain that GIT_DIFF displays changes in the codebase
- try to extract the intent of the changes, don't focus on the details
- use bullet points to list the changes
${gitmojis ? `- use gitmoji to make the description more engaging` : ``}
- focus on the most important changes
- do not try to fix issues, only describe the changes
- ignore comments about imports (like added, remove, changed, etc.)
- do not generate links
`.role("system");
if (instructions) $`${instructions}`.role("system");
